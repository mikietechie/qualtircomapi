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
  console.log({files, fields});
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
    content: page.content.map((content) => content.str).join(" "),
    links: page.links.join(","),
  }));
  return pages;
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
        content: "You are an assistant that responds in JSON format only.",
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
  if (response.status !== 200) {
    logger.error(response.data);
    throw new Error(response.statusText);
  }
  logger.info(response.data);
  const content: string = response.data["choices"][0]["message"]["content"];
  const data: IParsedGptOutput = JSON.parse(content.slice(7, -3));
  if (!data.slides) {
    throw new Error("GPT did not understand your document well.");
  }
  return data;
};
