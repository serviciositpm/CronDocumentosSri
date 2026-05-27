export class CredencialSRI {
  constructor(
    public readonly ruc: string,
    public readonly password: string,
    public readonly urlDestino: string,
    public readonly codmsg: number
  ) {}
}