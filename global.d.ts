declare module "*.css";

declare namespace NodeJS {
	interface ProcessEnv {
		OPENAI_API_KEY?: string;
		KV_REST_API_URL?: string;
		KV_REST_API_TOKEN?: string;
		KV_REST_API_READ_ONLY_TOKEN?: string;
		BLOB_READ_WRITE_TOKEN?: string;
		NEXT_PUBLIC_BLOB_BASE_URL?: string;
		NEXT_PUBLIC_CHAT_SUGGESTIONS_DISABLED?: string;
		RATE_LIMIT_TIMEZONE?: string;
	}
}

declare module "mammoth/mammoth.browser" {
	interface MammothMessage {
		message: string;
		type: string;
	}

	interface MammothResult {
		value: string;
		messages: MammothMessage[];
	}

	export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}

declare module "pdfjs-dist/legacy/build/pdf" {
	import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

	export const GlobalWorkerOptions: {
		workerSrc?: string;
		workerPort?: unknown;
	};

	export function getDocument(source: unknown): {
		promise: Promise<PDFDocumentProxy>;
	};
}
