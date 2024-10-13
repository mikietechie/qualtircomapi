/* eslint-disable no-empty */
import { Request } from "express";
import * as logger from "firebase-functions/logger";
import * as formidable from "formidable";
import * as fs from "node:fs";
import axios from "axios";
import {
  PDFExtract,
  PDFExtractResult,
} from "pdf.js-extract";


interface IUserInput {
  title: string;
  document: formidable.File;
}

interface IPDFPage {
  pageNumber: number;
  content: string;
  links: string;
}

interface ISlide {
  content: string;
  title: string;
  pageNumber?: number;
}

interface IParsedGptOutput {
  meta: {
    title: string;
    headline: string;
  };
  slides: ISlide[];
}


export const getInputFromRequest = async (
  req: Request
): Promise<IUserInput> => {
  const form = formidable.formidable({
    maxFiles: 1,
    maxFields: 2,
    maxFileSize: 5 * 1024 * 1024,
    filter: (part) => (part.mimetype === "application/pdf"),
  });
  const [fields, files] = await form.parse(req);
  console.log({ files, fields });
  const document = files.document?.at(0);
  if (!document) {
    throw new Error("Document was not provided.");
  }
  const title = fields.title?.at(0) || "";
  return { title, document };
};


export const getTextPagesFromPDF = async (
  payload: IUserInput
): Promise<IPDFPage[]> => {
  const pdfExtract = new PDFExtract();
  let data: PDFExtractResult;
  try {
    data = await pdfExtract.extract(
      payload.document.filepath,
      {}
    );
  } catch (error) {
    throw new Error(error as never as string);
  } finally {
    fs.unlink(payload.document.filepath, (err) => {
      logger.error(`Failed to delete file ${payload.document.filepath}`);
      logger.error(err);
    });
  }
  const pages = data.pages.map((page) => Object.assign({
    pageNumber: page.pageInfo.num,
    content: page.content
      .map((content) => content.str)
      .filter((content) => content !== "")
      .join(" "),
    links: page.links.join(","),
  }));
  return pages;
};

export const getPDFOutput = async (
  title: string,
  pages: IPDFPage[]
): Promise<IParsedGptOutput> => {
  // Development mode function, used when we cannot access GPT API
  return {
    meta: {
      title,
      headline: title,
    },
    slides: pages.map((page, index) => Object.assign({
      pageNumber: index + 1,
      title: page.content.slice(0, Math.min(page.content.indexOf(".")+1, 25)),
      content: page.content.slice(0, 200) + "...",
    })),
  };
};

/**
 *
 * @param {string} title of document or presentation
 * @param {array} pages list of pages
 * @return {object} Data
 * NOTE: I did not have time to use the node js open API library.
 */
export const getGptOutput = async (
  title: string,
  pages: IPDFPage[]
): Promise<IParsedGptOutput> => {
  const openApiUrl = "https://api.openai.com/v1/chat/completions";
  const TOKEN = process.env.OPENAPI_KEY;
  const body = `The document is about ${title}. I want a slide for every 
  page in the document. The response should have a title and content for 
  each page, if the page is too long it must be summarized. I also want 
  a title and headline as meta info`.replaceAll("\n", " ");
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant that responds in plain JSON format only.
        I must be able to parse the JSON using JavaScript JSON.parse function`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify(pages),
          },
          {
            type: "text",
            text: body,
          },
          {
            type: "text",
            text: `The JSON response object should strictly have the keys 
            meta and slides. Meta is a dictionary with the keys title and 
            headline. Slides is an array of dictionaries with keys title, 
            content and pageNumber. The content of a slide should have 
            strictly 20 to 30 words`.replaceAll("\n", " "),
          },
        ],

      },
    ],
  };
  const response = await axios.post(
    openApiUrl,
    payload,
    {
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN}`,
      },
    },
  );
  logger.info("Open API Response\n");
  logger.info(response.data);
  if (response.status !== 200) {
    throw new Error(response.statusText);
  }
  const content: string = response.data["choices"][0]["message"]["content"];
  const data = parseGptContent(content);
  logger.debug("Parsed GPT data");
  logger.debug(data);
  if (!data.slides) {
    throw new Error("GPT did not understand your document well.");
  }
  return data;
};


const parseGptContent = (content: string): IParsedGptOutput => {
  try {
    return JSON.parse(content);
  } catch (_) { }
  try {
    return JSON.parse(
      content.slice(content.indexOf("{"), content.indexOf("}") + 1)
    );
  } catch (_) { }
  try {
    return JSON.parse(content.slice(7, -3));
  } catch (_) { }
  try {
    return JSON.parse(content.replaceAll("\\\"", "\""));
  } catch (_) { }
  return {} as never;
};
