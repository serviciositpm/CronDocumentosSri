export class CredencialSRI {
  length: number | undefined;
  constructor(
    public readonly ruc: string,
    public readonly password: string,
    public readonly urlDestino: string,
    public readonly codmsg: number
  ) {}
}