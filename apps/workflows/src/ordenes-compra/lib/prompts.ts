export const CLASSIFICATION_PROMPT = `Eres un clasificador de emails. Tu tarea es determinar si un email es una "Orden de compra" o "Otro".

Una orden de compra contiene textos similares a:
- "orden compra", "OC", "purchase order", "PO"
- "solicitud de compra", "pedido de compra", "requisición de compra"
- "programación", "Programación Pastry Chef"
- "documento de orden de compra", "confirmación de compra"
- "número de orden de compra", "documento OC"

Responde ÚNICAMENTE con una de estas dos opciones:
- "Orden de compra"
- "Otro"`;

export const EXTRACTION_PROMPT = `Analiza este PDF y devuélveme los datos en formato JSON con una tabla estructurada. El siguiente texto es una orden de compra. Extrae y estructura la siguiente información: CLIENTE (Nunca puede ser: PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS), SUCURSAL, OC (número de orden de compra), PRODUCTO, FECHA DE ENTREGA, CANTIDAD SOLICITADA, PRECIO y DIRECCIÓN.

Reglas importantes:
1. La orden puede tener múltiples productos/líneas.
2. Extrae el nombre completo del producto, incluyendo todos los detalles.
3. El CLIENTE NUNCA puede ser: "PASTRY CHEF PASTELERIA Y COCINA GOURMET SAS". Siempre elige la otra empresa presente en el texto y extrae TODOS los nombres que consideres que tienen que ver con la empresa (razones sociales y nombres comerciales) y únelos todos en el campo de cliente.
4. La CANTIDAD SOLICITADA siempre debe extraerse únicamente de la columna de cantidad que aparece separada en la orden. ⚠️ Nunca confundirla con los números dentro de la descripción del producto (gramos, peso, presentaciones, unidades por paquete u otras cifras). Solo esa columna independiente representa la cantidad solicitada.
5. Estructura la respuesta en JSON con los siguientes campos:

{
  "CLIENTE": "Nombre de la empresa",
  "SUCURSAL": "Nombre de la sucursal (extrae toda la información relacionada y únela)",
  "OC": "Número de orden de compra",
  "PRODUCTOS": [
    {
      "PRODUCTO": "Nombre completo del producto",
      "FECHA DE ENTREGA": "AAAA-MM-DD",
      "CANTIDAD SOLICITADA": 0,
      "PRECIO": 0
    }
  ],
  "DIRECCIÓN": "Dirección de entrega"
}

Formato para FECHA DE ENTREGA (ISO 8601):
- Siempre convertir cualquier formato de entrada a AAAA-MM-DD.
- Ejemplos: 28/11/2024 → 2024-11-28; noviembre 28, 2024 → 2024-11-28; 28-11 → usar año actual.
- Si la entrada no incluye el año, asumir el año actual.
- Solo usar como fecha de entrega aquella explícitamente nombrada como tal.

Formato para PRECIO:
- Extraer únicamente el precio unitario, ignorar precios totales.
- Ignorar símbolos y separadores de miles (ejemplo: "$25,000" → 25000).
- Si el precio tiene decimales, mantenerlos.

Formato para DIRECCIÓN:
- Extraer la dirección más probable, incluyendo calle, número y ciudad.

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;
