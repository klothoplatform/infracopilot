import { v4 as uuidv4 } from "uuid";
import type { ReactNode } from "react";

export enum ErrorType {
  API = "APIError",
  UI = "UIError",
  Application = "ApplicationError",
  UNKNOWN = "UnknownError",
}

type Keyed = {
  [key: string]: any;
};

export class ApplicationError extends Error {
  __proto__ = Error;
  errorId?: string;
  id: string;
  data?: Keyed;
  messageComponent?: ReactNode;

  constructor({
    message,
    messageComponent,
    errorId,
    data,
    type,
    cause,
  }: {
    message: string;
    messageComponent?: ReactNode;
    errorId?: string;
    data?: Keyed;
    type?: ErrorType;
    cause?: Error;
  }) {
    super(message, { cause });
    Object.setPrototypeOf(this, ApplicationError.prototype);

    this.messageComponent = messageComponent;
    this.name = type ?? ErrorType.Application;
    this.errorId = errorId;
    this.id = uuidv4().toString();
    this.data = data;
  }
}

export class ApiError extends ApplicationError {
  status?: number;
  statusText?: string;
  url?: string;

  constructor({
    errorId,
    message,
    status,
    statusText,
    url,
    data,
    cause,
    messageComponent,
  }: {
    errorId?: string;
    message: string;
    status?: number;
    statusText?: string;
    url?: string;
    data?: Keyed;
    cause?: Error;
    messageComponent?: ReactNode;
  }) {
    super({
      message,
      errorId,
      data,
      type: ErrorType.API,
      cause,
      messageComponent,
    });
    Object.setPrototypeOf(this, ApiError.prototype);

    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

export class UIError extends ApplicationError {
  constructor({
    errorId,
    message,
    messageComponent,
    data,
    cause,
  }: {
    message: string;
    messageComponent?: ReactNode;
    errorId?: string;
    data?: Keyed;
    cause?: Error;
  }) {
    super({
      message,
      errorId,
      data,
      type: ErrorType.UI,
      cause,
      messageComponent,
    });
    Object.setPrototypeOf(this, UIError.prototype);
  }
}
