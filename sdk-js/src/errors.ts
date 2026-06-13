export class ICAError extends Error {
  public error: string;
  public error_description: string;
  public status?: number;

  constructor(error: string, error_description: string, status?: number) {
    super(`${error}: ${error_description}`);
    this.name = 'ICAError';
    this.error = error;
    this.error_description = error_description;
    this.status = status;
    Object.setPrototypeOf(this, ICAError.prototype);
  }
}
