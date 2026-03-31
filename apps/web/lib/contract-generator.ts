import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, TabStopType, TabStopPosition,
  PageBreak,
} from 'docx'
import { saveAs } from 'file-saver'
import { EmployeeRecord } from '@/hooks/use-employee-directory'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '_______________'
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '_______________'
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0
  const today = new Date()
  const b = new Date(birthDate + 'T12:00:00')
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

function genderWord(gender: string | null): string {
  if (!gender) return '______'
  const g = gender.toLowerCase()
  if (g === 'masculino' || g === 'hombre') return 'hombre'
  if (g === 'femenino' || g === 'mujer') return 'mujer'
  return gender
}

function genderArticle(gender: string | null): { el: string; del: string; al: string } {
  const g = (gender || '').toLowerCase()
  if (g === 'femenino' || g === 'mujer') {
    return { el: 'la', del: 'de la', al: 'a la' }
  }
  return { el: 'el', del: 'del', al: 'al' }
}

function salaryInWords(salaryStr: string | null): string {
  if (!salaryStr) return '_______________'
  const num = parseInt(salaryStr.replace(/[^0-9]/g, ''), 10)
  if (isNaN(num)) return '_______________'
  return `${numberToWords(num)} PESOS M/CTE.`
}

function numberToWords(n: number): string {
  if (n === 0) return 'CERO'

  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const twenties = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']

  function hundreds(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'
    if (n < 10) return units[n]
    if (n < 20) return teens[n - 10]
    if (n < 30) return twenties[n - 20]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const u = n % 10
      return u === 0 ? tens[t] : `${tens[t]} Y ${units[u]}`
    }
    const h = Math.floor(n / 100)
    const rest = n % 100
    const hWord = h === 1 ? 'CIENTO' : h === 5 ? 'QUINIENTOS' : h === 7 ? 'SETECIENTOS' : h === 9 ? 'NOVECIENTOS' : `${units[h]}CIENTOS`
    return rest === 0 ? (h === 1 ? 'CIEN' : hWord) : `${hWord} ${hundreds(rest)}`
  }

  if (n < 1000) return hundreds(n)

  if (n < 1000000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    const tWord = thousands === 1 ? 'MIL' : `${hundreds(thousands)} MIL`
    return rest === 0 ? tWord : `${tWord} ${hundreds(rest)}`
  }

  const millions = Math.floor(n / 1000000)
  const rest = n % 1000000
  const mWord = millions === 1 ? 'UN MILLÓN' : `${hundreds(millions)} MILLONES`
  if (rest === 0) return mWord
  if (rest < 1000) return `${mWord} ${hundreds(rest)}`
  const thousands = Math.floor(rest / 1000)
  const restHundreds = rest % 1000
  const tWord = thousands === 0 ? '' : thousands === 1 ? 'MIL' : `${hundreds(thousands)} MIL`
  const hWord = restHundreds === 0 ? '' : hundreds(restHundreds)
  return `${mWord} ${tWord} ${hWord}`.replace(/\s+/g, ' ').trim()
}

function formatSalaryNumber(salaryStr: string | null): string {
  if (!salaryStr) return '$_______________'
  const num = parseInt(salaryStr.replace(/[^0-9]/g, ''), 10)
  if (isNaN(num)) return '$_______________'
  return `$${num.toLocaleString('es-CO')}`
}

function v(val: string | null | undefined, fallback = '_______________'): string {
  return val?.trim() || fallback
}

// ─── Document builder ──────────────────────────────────────────────────────

function p(text: string, options?: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: { after?: number; before?: number } }): Paragraph {
  return new Paragraph({
    alignment: options?.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: options?.spacing?.after ?? 120, before: options?.spacing?.before ?? 0 },
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        size: 22,
        font: 'Arial',
      }),
    ],
  })
}

function title(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200, before: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: 'Arial',
      }),
    ],
  })
}

function signatureLine(left: string, right: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: '___________________________', size: 22, font: 'Arial' }),
        new TextRun({ text: '\t\t\t', size: 22, font: 'Arial' }),
        new TextRun({ text: '___________________________', size: 22, font: 'Arial' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: left, bold: true, size: 22, font: 'Arial' }),
        new TextRun({ text: '\t\t\t', size: 22, font: 'Arial' }),
        new TextRun({ text: right, bold: true, size: 22, font: 'Arial' }),
      ],
    }),
  ]
}

// ─── isOperario check ───────────────────────────────────────────────────

function isOperario(emp: EmployeeRecord): boolean {
  const cat = (emp.employee_category || 'Operario').toLowerCase()
  return !cat.includes('dirección') && !cat.includes('manejo') && !cat.includes('confianza')
}

// ─── Main export ────────────────────────────────────────────────────────

export async function generateContract(emp: EmployeeRecord) {
  const operario = isOperario(emp)
  const age = calcAge(emp.birth_date)
  const gender = genderWord(emp.gender)
  const salaryNum = formatSalaryNumber(emp.salary)
  const salaryWords = salaryInWords(emp.salary)
  const hireDateFormatted = formatDateFull(emp.hire_date)
  const todayFormatted = formatDateFull(emp.hire_date || new Date().toISOString().split('T')[0])

  // Determine company info
  const companyName = emp.company === 'PASTRYCOL' ? 'PASTRY COLOMBIA S.A.S.' : 'PASTRY CHEF PASTELERÍA Y COCINA GOURMET S.A.S.'
  const nit = emp.company === 'PASTRYCOL' ? '901.234.567-8' : '900.123.456-7'

  const manejoYConfianzaText = operario
    ? ''
    : ', las que, dada su naturaleza y responsabilidad, aceptan las partes sean propias de un cargo de dirección manejo y confianza'

  const jornadaText = operario
    ? 'EL TRABAJADOR se obliga a laborar la jornada ordinaria en los turnos y dentro de las horas señalados por el EMPLEADOR, pudiendo hacer éste ajustes o cambios de horario cuando lo estime conveniente. Por el acuerdo expreso o tácito de las partes, podrán repartirse las horas de la jornada ordinaria de la forma prevista en el artículo 164 del Código Sustantivo del Trabajo, modificado por el artículo 3 de la ley 2101 de 2021, teniendo en cuenta que los tiempos de descanso entre las secciones de la jornada no se computan dentro de la misma.'
    : 'EL TRABAJADOR se obliga a cumplir sus funciones por el tiempo que sea necesario para desarrollar a cabalidad sus funciones, las que por ser de confianza excluyen la aplicación de la jornada máxima legal de trabajo. El trabajo podrá ser distribuido de conformidad con la actividad operativa de la empresa sin que ello implique limitación de su jornada sino acomodamiento y coordinación con la actividad general o particular de la empresa. De la misma manera, como consecuencia de las nuevas tecnologías de administración adoptadas por la empresa y de los avances tecnológicos, llegado el caso, EL TRABAJADOR podrá tener la posibilidad de usar cualquier medio tecnológico que la empresa le llegue a proporcionar para el acceso remoto de la información, desde cualquier parte y en cualquier momento, lo que implica que EL TRABAJADOR puede tener acceso a este sistema desde fuera del lugar ordinario de trabajo, aún desde su casa de habitación o de cualquier otro lugar y puede ocurrir dentro de la jornada ordinaria de trabajo de la empresa o fuera de ella, lo que ratifica su condición de TRABAJADOR de dirección manejo y confianza, sin límite en su jornada.'

  const paragraphs: Paragraph[] = []

  // Title
  paragraphs.push(title('CONTRATO LABORAL A TÉRMINO INDEFINIDO'))
  paragraphs.push(new Paragraph({ spacing: { after: 200 } }))

  // Intro paragraph
  paragraphs.push(p(
    `Entre los suscritos a saber, NICOLAS QUINTERO HOYOS, hombre, mayor de edad y vecino de Bogotá D.C., identificado con Cédula de Ciudadanía Nº 1.018.480.493 expedida en Bogotá, quien actúa en calidad de Representante Legal de ${companyName}, sociedad comercial legalmente constituida, con domicilio principal en Bogotá D.C. y sus dependencias ubicadas en la CRA 53 A # 127-30 TORRE 2, APTO 307 de Bogotá, quien en adelante se denominará el EMPLEADOR, por una parte, y por la otra, ${v(emp.full_name).toUpperCase()}, ${gender}, de ${age} años de edad, identificada con la Cédula de Ciudadanía No. ${v(emp.document_number)}${emp.document_expedition_city ? ` expedida en ${v(emp.document_expedition_city)}` : ''}, con residencia en la ${v(emp.address)} (Bogotá), única dirección válida para todos los efectos legales especialmente para los previstos en el artículo 29 parágrafo 1º de la ley 789/02, hasta tanto EL TRABAJADOR no comunique a la empleadora por escrito una nueva dirección, de nacionalidad ${v(emp.nationality, 'Colombiana')} y que en lo sucesivo se denominará EL TRABAJADOR, se ha celebrado el Contrato de Trabajo que se consigna en las siguientes cláusulas:`
  ))

  // CLÁUSULA PRIMERA
  paragraphs.push(p(
    `CLÁUSULA PRIMERA. - EL TRABAJADOR, se obliga personalmente y con el carácter de exclusividad a: 1º). Desempeñar con diligencia y cuidado el cargo y funciones de ${v(emp.position).toUpperCase()}${manejoYConfianzaText} y todas las demás actividades propias, anexas y/o complementarias del cargo, oficio o funciones, para el que se le ha contratado y a incorporar su capacidad normal de trabajo al servicio del EMPLEADOR, en el desempeño de las funciones asignadas y el cumplimiento de las demás obligaciones, prohibiciones e instrucciones que le correspondan y de conformidad con la ley, los reglamentos, políticas, circulares, órdenes, instrucciones, indicaciones, descripciones de su cargo, evaluaciones de desempeño y demás medios que utilice la empresa y que reciba del EMPLEADOR y sus representantes, pero igualmente adquiere la obligación de desempeñar cualquiera otra función que le sea señalada por el mismo EMPLEADOR lo que acepta de antemano; 2º). A desempeñar sus funciones tanto en la ciudad de Bogotá DC, como en las demás ciudades, poblaciones o lugares a donde se deba desplazar para el cumplimiento de las funciones en Colombia, siendo este aspecto una de las características por las cuales se le contrató, en consecuencia el hecho de que EL TRABAJADOR deba prestar sus servicios inicialmente en un determinado lugar no implica su inmovilidad, obligándose a cumplir los traslados, transferencias o cambios que se hagan de lugar, renunciando a aducir para negarse, motivos personales, familiares y sociales; 3º). A no prestar servicios dependientes a otros empleadores y a no realizar servicios independientes dentro de las horas destinadas al cumplimiento de sus funciones ni fuera de ellas en actividades que tengan que ver con las que realiza EL TRABAJADOR dentro de la empresa y con el giro de los negocios del EMPLEADOR o las que correspondan al objeto social de la empresa contratante. Sus familiares, dentro del cuarto grado de consanguinidad, segundo de afinidad y/o primero civil, no podrán tener ningún tipo de vinculación contractual con personas dedicadas a actividades que tengan que ver con el giro de los negocios del EMPLEADOR; 4º). A guardar estricta reserva y por lo tanto no podrá dar a conocer a terceros ni a trabajadores de la empresa, que no estén vinculados directamente con la información, de todo lo que llegue a su conocimiento por cualquier medio, ya sea por razones de su oficio o por su relación con la empresa independientemente de su carácter reservado y de que pueda causar perjuicios a la empresa; 5º). A utilizar los enseres, útiles, herramientas, instrumentos y demás elementos que le entregue la empresa exclusivamente para los fines que le fueron suministrados y a mantenerlos, conservarlos y restituirlos en buen estado, salvo el deterioro natural por el uso y se compromete a firmar los documentos de entrega de los mismos donde figuran los valores correspondientes en caso de reposición, deducción o compensación; 6º). A autorizar por medio de este contrato la retención, deducción y/o compensación de su salario, prestaciones sociales, acreencias y demás derechos laborales, de las sumas que adeude al EMPLEADOR que tengan su origen directo en el contrato de trabajo, tales como anticipos de salarios, prestaciones, compensaciones y demás derechos, pagos efectuados de más o malas liquidaciones por los mismos conceptos, y por lo tanto exonera a la empresa de contar con autorización escrita y para cada caso, para efectuar estas deducciones, compensaciones y descuentos. Cuando se trate de daños ocasionados a los edificios, máquinas, materias primas, productos elaborados y demás cosas y objetos de propiedad de la empresa, así como la pérdida de elementos de trabajo, se obliga a firmar un recibo para cada caso en el que autoriza para descontar de su salario, de sus prestaciones, compensación en dinero de vacaciones, derechos y demás acreencias, las cantidades correspondientes y necesarias para pagar tales daños y pérdidas. El incumplimiento de las anteriores obligaciones, prohibiciones y deberes se califica como falta grave.`,
  ))

  // CLÁUSULA SEGUNDA
  paragraphs.push(p(
    `CLÁUSULA SEGUNDA – REMUNERACIÓN: EL EMPLEADOR reconocerá y pagará como retribución por todos los servicios que preste EL TRABAJADOR, un SALARIO ORDINARIO de (${salaryNum} ${salaryWords}). Salario pagadero por periodos iguales y vencidos, directamente a EL TRABAJADOR o por conducto del sistema bancario, según lo decida el empleador.`,
  ))
  paragraphs.push(p(
    'PARÁGRAFO. - Remuneración de descansos dominicales y festivos: Las partes acuerdan que toda remuneración variable que reciba el trabajador se distribuye así: el 80% corresponde a remuneración ordinaria y el 20% restante para remunerar los descansos dominicales y festivos correspondientes.',
  ))
  paragraphs.push(p(
    'PARÁGRAFO.- Pagos no constitutivos de salario: De conformidad con lo estipulado en los artículos 15 y 16 de la ley 50 de 1990, las partes acuerdan expresamente no considerar como salario los beneficios y auxilios, ocasionales o habituales, en dinero o especie que pague y suministre o haya suministrado a EL TRABAJADOR a cualquier título, dentro de la jornada ordinaria de trabajo o fuera de ella, por concepto de alimentación, o vestuario, ya sea en comedores o cafeterías de la empresa o mediante terceros. Igualmente se acuerda que no constituya salario lo que reciba EL TRABAJADOR por concepto, llegado el caso, de primas extralegales o beneficios que esté dando o vaya a dar en el futuro el EMPLEADOR, por cualquier concepto o naturaleza.',
  ))

  // CLÁUSULA TERCERA
  paragraphs.push(p(`CLÁUSULA TERCERA - JORNADA DE TRABAJO: ${jornadaText}`))

  // CLÁUSULA CUARTA
  paragraphs.push(p(
    `CLÁUSULA CUARTA - DURACIÓN DEL CONTRATO: El contrato inicia el ${hireDateFormatted}.`,
  ))

  // CLÁUSULA QUINTA
  paragraphs.push(p(
    'CLÁUSULA QUINTA - CAUSAS DE TERMINACIÓN DEL CONTRATO: Habrá lugar a la terminación de este contrato por las justas causas previstas en la ley y, además, por cualquier falta grave calificada como tal en el presente contrato, o reglamento interno de la compañía o en los reglamentos expedidos por la compañía.',
  ))

  // CLÁUSULA SEXTA - FALTAS GRAVES
  paragraphs.push(p(
    'CLÁUSULA SEXTA - FALTAS GRAVES. Constituyen faltas por parte de EL TRABAJADOR, que se califican como graves, además de las previstas en la ley y reglamentos, las siguientes:',
  ))
  paragraphs.push(p(
    'a) Negarse sin razón justificada a trabajar en los días de descanso cuando el EMPLEADOR por motivos de compromisos, producción o de cualquiera otra índole, le solicite el trabajo en tales días; b).- La no asistencia puntual al trabajo por dos (2) veces dentro de un mismo mes calendario, sin excusa suficiente a juicio del EMPLEADOR; c).- Las frecuentes desavenencias, disputas, discusiones y/o alegatos con sus compañeros de trabajo; d).- Que el TRABAJADOR llegue o se presente a trabajar bajo los efectos del alcohol o embriagada o bajo la influencia de narcóticos o drogas enervantes o porte o ingiera bebidas alcohólicas o consuma drogas enervantes dentro de los sitios de trabajo, así todo lo anterior ocurra por la primera vez; e).- Que EL TRABAJADOR se ausente o abandone el sitio del trabajo por motivos diferentes a los de su trabajo; f).- La no asistencia a una sección completa de la jornada de trabajo o más, sin excusa suficiente a juicio del EMPLEADOR; g).- Atender durante las horas de trabajo ocupaciones distintas de las que le corresponden o adelantar otras labores que afecten su capacidad de trabajo; h).- Fomentar charlas, corrillos o tertulias en los sitios de trabajo y durante la jornada respectiva; i) Impedir que la empresa le practique el examen de alcoholemia, o que ésta tome alguna otra medida que procure impedir accidentes de trabajo; j) No utilizar los elementos de protección personal o no utilizarlos adecuadamente.',
  ))
  paragraphs.push(p(
    'PARÁGRAFO. - Cualquier violación de las obligaciones y prohibiciones establecidas en este contrato, en los reglamentos del empleador y las previstas en los artículos 58 y 60 del Código Sustantivo del Trabajo se acuerda expresamente con EL TRABAJADOR calificarlas como falta grave, por lo que legal y jurisprudencialmente constituyen justa causa de terminación unilateral del contrato de trabajo por parte del EMPLEADOR, no siendo susceptible este calificativo de discusión judicial.',
  ))

  // CLÁUSULA SÉPTIMA - Only for non-operarios
  if (!operario) {
    paragraphs.push(p(
      `CLÁUSULA SÉPTIMA - CALIFICACIÓN DE FUNCIONES PARA DIRECCIÓN MANEJO Y CONFIANZA: Las funciones de EL TRABAJADOR consisten en las propias del cargo de ${v(emp.position).toUpperCase()} y todas aquellas que le sean asignadas acorde con la naturaleza del cargo, garantizando la disponibilidad y el buen uso de los recursos financieros, humanos y físicos para el cumplimiento de los lineamientos estratégicos de manera adecuada y exitosa.`,
    ))
    paragraphs.push(p(
      'PARÁGRAFO. - Las anteriores funciones son en si mismas de tal importancia que no dejan lugar a dudas sobre la naturaleza y responsabilidades del cargo desempeñado por EL TRABAJADOR, por lo que aceptan las partes que por ellas sea calificado el cargo como de dirección manejo y confianza.',
    ))
  }

  // CLÁUSULA OCTAVA (or SÉPTIMA for operarios)
  const clauseNum = operario ? 'SÉPTIMA' : 'OCTAVA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseNum} - USO DE COMPUTADORES: Como la Empresa suministra o puede llegar a suministrar a el TRABAJADOR computadores para realizar su trabajo y cumplir con sus funciones, ésta adquiere la obligación de solo utilizar los softwares que le suministra el Empleador. Dadas las implicaciones que existen por la utilización de software sin licencia, la Empresa le prohíbe enfáticamente la utilización de software sin licencia y constituye un acto propio y exclusivo de EL TRABAJADOR quien asume expresamente las consecuencias civiles, comerciales y penales que el incumplimiento de tal prohibición acarree, exonerando a la Empleadora de cualquier responsabilidad al respecto. El incumplimiento de esta obligación y prohibición se califica como falta grave, sin perjuicio de las demás responsabilidades legales o extralegales que se deriven para EL TRABAJADOR y respecto de las cuales debe responder exclusivamente.`,
  ))
  paragraphs.push(p(
    'PARÁGRAFO 1: Queda absolutamente prohibida la transferencia, copia o reproducción de archivos, software, imágenes o textos de Internet, páginas o carteleras públicas al computador o a la red de datos de la empleadora o de las compañías donde ella tenga relación. Para proceder a transferir, copiar y reproducir archivos autorizados o relacionados con las funciones asignadas, deberá revisarse previamente a través del antivirus correspondiente. EL TRABAJADOR se compromete a que el computador asignado y la red de datos de la empleadora no serán utilizados para el acceso, exhibición, copia, circulación, almacenamiento o distribución de información pornográfica, racista, sexista o que induzca al delito ni para la difusión de otros materiales políticamente sensibles, disponibles a través de Internet o para el almacenamiento de archivos de tipo MP3 que congestionen el buen funcionamiento del equipo.',
  ))
  paragraphs.push(p(
    'PARÁGRAFO 2: EL TRABAJADOR conoce, acepta y autoriza al EMPLEADOR para que éste, utilizando los sistemas magnetofónicos correspondientes, monitoree y grabe todas y cada una de las conversaciones telefónicas que el primero sostenga desde o con las instalaciones del EMPLEADOR.',
  ))
  paragraphs.push(p(
    'PARÁGRAFO 3: La violación de las obligaciones o prohibiciones a que se refiere esta cláusula se acuerda calificarla como falta grave.',
  ))

  // CLÁUSULA - FIDELIDAD Y RESERVA
  const clauseFidelidad = operario ? 'OCTAVA' : 'NOVENA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseFidelidad} - FIDELIDAD Y RESERVA: EL TRABAJADOR se obliga a desempeñar el cargo con lealtad, buena fe y fidelidad al EMPLEADOR y por lo tanto adquiere la obligación de que todos los asuntos que conozca directa o indirectamente por razón de su cargo o por estar vinculada con la Empleadora, tendrán el carácter de reservados y por tal motivo no podrán ser revelados por ningún medio a terceros o a personal vinculado a la Empleadora o a la empresa o empresa con las cuales ella tenga relación, que no deban conocerlos por razón de sus funciones. Tiene especial carácter de reservados todo lo que tenga que ver con la situación financiera de la Empleadora y de las empresas en las que ella tenga relación, su producción, procesos, operaciones comerciales, financieras, bancarias, administrativas, técnicas, base de datos de toda clase, fórmulas y procedimientos industriales, técnicos, comerciales, entre otros. La violación de esta obligación se califica como falta grave sin perjuicio de las otras acciones legales y extralegales a que haya lugar.`,
  ))

  // CLÁUSULA - INVENCIONES
  const clauseInvenciones = operario ? 'NOVENA' : 'DÉCIMA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseInvenciones} - INVENCIONES Y DESCUBRIMIENTOS: EL TRABAJADOR acepta de manera expresa y voluntaria que todas las cuestiones, procedimientos, descubrimientos, invenciones, fórmulas y las mejoras en los procedimientos de cualquier tipo que EL TRABAJADOR llegue a producir, generar o crear, lo mismo que todos los trabajos y consiguientes resultados de las actividades de EL TRABAJADOR durante la prestación sus servicios al EMPLEADOR, quedarán de propiedad exclusiva de la Empleadora, de conformidad con lo dispuesto en la decisión 311 del Acuerdo de Cartagena o las normas que lo modifiquen, adicionen o deroguen. El incumplimiento de esta obligación se califica como falta grave.`,
  ))

  // CLÁUSULA - CONFIDENCIALIDAD
  const clauseConf = operario ? 'DÉCIMA' : 'DÉCIMA PRIMERA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseConf} - CONFIDENCIALIDAD: EL TRABAJADOR no podrá, cualquiera que sea su finalidad u objeto sacar, extraer, enviar por cualquier medio, documentos, datos o informes fuera de la Empresa con destino a terceros o a trabajadores de la empleadora o de las empresas en la que ésta tenga interés. Tampoco podrá permitir que otras personas, aún de la empresa lo hagan, ni omitir esta información a la Empleadora cuando tenga conocimiento de esto. El incumplimiento de esta obligación se califica como falta grave.`,
  ))

  // CLÁUSULA - BENEFICIARIOS
  const clauseBenef = operario ? 'DÉCIMA PRIMERA' : 'DÉCIMA SEGUNDA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseBenef} - BENEFICIARIOS: Para todos los efectos que nazcan del presente contrato sin perjuicio de lo que se establezca en la ley, EL TRABAJADOR declara que sus beneficiarios son: ${v(emp.beneficiaries)}.`,
  ))

  // CLÁUSULA - ABANDONO
  const clauseAbandono = operario ? 'DÉCIMA SEGUNDA' : 'DÉCIMA TERCERA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseAbandono} - ABANDONO O TERMINACIÓN UNILATERAL POR PARTE DEL TRABAJADOR: La ausencia o no asistencia de EL TRABAJADOR por un mínimo de tres días a su sitio o lugar de trabajo se califica como terminación unilateral e intempestiva del contrato por parte de EL TRABAJADOR. Después de este término el EMPLEADOR consignará el valor de la liquidación definitiva ante el Juez del Trabajo.`,
  ))

  // CLÁUSULA - REGULACIÓN
  const clauseReg = operario ? 'DÉCIMA TERCERA' : 'DÉCIMA CUARTA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseReg} - REGULACIÓN: El presente contrato se ha celebrado de conformidad con la ley, la jurisprudencia, la sana interpretación de las normas laborales y por lo tanto de buena fe.`,
  ))

  // CLÁUSULA - IDENTIFICACIÓN Y DOMICILIO
  const clauseId = operario ? 'DÉCIMA CUARTA' : 'DÉCIMA QUINTA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseId} - IDENTIFICACIÓN Y DOMICILIO: EL TRABAJADOR es oriundo de ${v(emp.birth_place).toUpperCase()} y nació el día ${formatDate(emp.birth_date)} en la ciudad de ${v(emp.birth_place).toUpperCase()} y reside actualmente en la ${v(emp.address)}, de Bogotá. EL TRABAJADOR adquiere la obligación de informar inmediatamente los cambios de dirección de su domicilio, si no lo hiciere el último existente se considerará como el actual y la empresa se exonera de cualquier responsabilidad enviando los documentos a esta dirección: ${v(emp.address)} de Bogotá, de acuerdo a lo establecido en la ley 789/02. El incumplimiento de esta obligación, dados sus efectos, se califica como falta grave.`,
  ))

  // CLÁUSULA - INFORMACIONES (EPS y Fondo)
  const clauseInfo = operario ? 'DÉCIMA QUINTA' : 'DÉCIMA SEXTA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseInfo} - INFORMACIONES: EL TRABAJADOR informa al EMPLEADOR que con anterioridad estuvo afiliada en las siguientes EPS ${v(emp.eps)} y AFP ${v(emp.pension_fund)}.`,
  ))
  paragraphs.push(p(
    `EL TRABAJADOR consiente de la libertad que le asiste ha escogido voluntariamente para efectos de afiliación al sistema de seguridad social, a la EPS y al FONDO DE PENSIONES para lo cual coloca de su puño y letra el nombre correspondiente. EPS _______________________ ; FONDO DE PENSIONES _____________________________________.`,
  ))

  // CLÁUSULA - VIGENCIA
  const clauseVig = operario ? 'DÉCIMA SEXTA' : 'DÉCIMA SÉPTIMA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseVig} - VIGENCIA Y EFECTIVIDAD DE LA RELACIÓN: Para todos los efectos que nazcan de este contrato se deja constancia de que EL TRABAJADOR ingreso al servicio del EMPLEADOR el día ${hireDateFormatted}, y por consiguiente cualquier otro tipo de contrato suscrito con anterioridad entre las partes de cualquier índole o naturaleza sin importar su modalidad o duración quedará sin ningún efecto, ya que el presente contrato es el único vigente.`,
  ))

  // CLÁUSULA - SG-SST
  const clauseSST = operario ? 'DÉCIMA SÉPTIMA' : 'DÉCIMA OCTAVA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseSST} – SG-SST: Para la firma del contrato EL TRABAJADOR acepta haber conocido las normas sobre el Sistema de Gestión de Seguridad y Salud en el Trabajo que rigen en la empresa, por lo que se compromete a cumplirlas fiel y cabalmente, razón por la cual su incumplimiento se califica como falta grave y exonera al EMPLEADOR de cualquier responsabilidad material, moral o fisiológica en el caso de que por tal incumplimiento ocurran accidentes de trabajo o enfermedades profesionales.`,
  ))

  // CLÁUSULA - REGLAMENTO INTERNO
  const clauseRI = operario ? 'DÉCIMA OCTAVA' : 'DÉCIMA NOVENA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseRI} - REGLAMENTO INTERNO DE TRABAJO: Para la firma del contrato EL TRABAJADOR acepta haber conocido el Reglamento Interno de Trabajo y da fe de que aparece fijado en las instalaciones de la empresa en por lo menos dos lugares.`,
  ))

  // CLÁUSULA - REGLAMENTOS
  const clauseRegl = operario ? 'DÉCIMA NOVENA' : 'VIGÉSIMA'
  paragraphs.push(p(
    `CLÁUSULA ${clauseRegl} – REGLAMENTOS: EL TRABAJADOR acepta el contenido de todos los reglamentos, políticas, circulares, etc. que la empleadora tiene o profiera en el futuro y, además, que el incumplimiento de las obligaciones y prohibiciones consagradas en ellos, es falta grave.`,
  ))

  // Firma
  paragraphs.push(new Paragraph({ spacing: { before: 300 } }))
  paragraphs.push(p(
    `Para constancia se firma ante testigos, en la ciudad de Bogotá D.C. el ${todayFormatted}, en dos ejemplares del mismo tenor y valor, uno de los cuales recibe EL TRABAJADOR y así lo hace constar expresamente.`,
  ))

  // Signature lines
  paragraphs.push(...signatureLine(
    'POR EL EMPLEADOR',
    'EL TRABAJADOR',
  ))
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: 'NICOLAS QUINTERO HOYOS', size: 22, font: 'Arial' }),
      new TextRun({ text: '\t\t\t', size: 22, font: 'Arial' }),
      new TextRun({ text: v(emp.full_name).toUpperCase(), size: 22, font: 'Arial' }),
    ],
  }))
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: 'C.C. No. 1.018.480.493', size: 22, font: 'Arial' }),
      new TextRun({ text: '\t\t\t', size: 22, font: 'Arial' }),
      new TextRun({ text: `C.C. No. ${v(emp.document_number)}`, size: 22, font: 'Arial' }),
    ],
  }))

  // Testigos
  paragraphs.push(new Paragraph({ spacing: { before: 600 } }))
  paragraphs.push(...signatureLine('TESTIGO 1', 'TESTIGO 2'))
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: 'C.C. No.', size: 22, font: 'Arial' }),
      new TextRun({ text: '\t\t\t\t', size: 22, font: 'Arial' }),
      new TextRun({ text: 'C.C. No.', size: 22, font: 'Arial' }),
    ],
  }))
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: 'Nombre', size: 22, font: 'Arial' }),
      new TextRun({ text: '\t\t\t\t', size: 22, font: 'Arial' }),
      new TextRun({ text: 'Nombre', size: 22, font: 'Arial' }),
    ],
  }))

  // Build document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: paragraphs,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `Contrato_${v(emp.full_name).replace(/\s+/g, '_')}_${operario ? 'Operario' : 'MYC'}.docx`
  saveAs(blob, fileName)
}
