export function devolverFormaPago(codformapago: string): string {
  const map: Record<string, string> = {
    '01': 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
    '15': 'COMPENSACIÓN DE DEUDAS',
    '16': 'TARJETA DE DÉBITO',
    '17': 'DINERO ELECTRÓNICO',
    '18': 'TARJETA PREPAGO',
    '19': 'TARJETA DE CRÉDITO',
    '20': 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO',
    '21': 'ENDOSO DE TÍTULOS'
  };
  return map[codformapago] || 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO';
}