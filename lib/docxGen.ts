import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";

export type DocxSource = {
  docName: string;
  fullName: string;
  course: string | null;
  issuedAt?: string;
  copies: number;
};

const FONT = "Segoe UI";

export function supportsDocx(docName: string): boolean {
  return docName === "Good Moral Certificate";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function loadLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("/rmclogo.jpg");
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function buildDocxBlob(doc: DocxSource): Promise<Blob> {
  if (!supportsDocx(doc.docName)) throw new Error(`No docx template for ${doc.docName}`);

  const issuedDate = doc.issuedAt ? new Date(doc.issuedAt) : new Date();
  const issuedFormal = `${issuedDate.getDate()}${ordinal(
    issuedDate.getDate()
  )} day of ${issuedDate.toLocaleDateString("en-US", { month: "long" })}, ${
    issuedDate.getFullYear()
  }`;

  const logo = await loadLogo();

  const letterhead: Paragraph[] = [];
  if (logo) {
    letterhead.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            data: logo,
            type: "jpg",
            transformation: { width: 75, height: 75 },
          }),
        ],
      })
    );
  }
  letterhead.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "REGIS MARIE COLLEGE",
          bold: true,
          size: 26,
          font: FONT,
          characterSpacing: 60,
        }),
      ],
    })
  );
  letterhead.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "#7072 Dollar Lane St., Villanueva Village, Brgy. San Dionisio, Sucat,",
          size: 18,
          font: FONT,
        }),
      ],
    })
  );
  letterhead.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "Parañaque City, Metro Manila 1700",
          size: 18,
          font: FONT,
        }),
      ],
    })
  );
  letterhead.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Contact No.: (02) 8671-01-99  •  admin@regismarie-college.com  •  www.regismariecollege.com",
          size: 18,
          font: FONT,
        }),
      ],
    })
  );

  const page = (): Paragraph[] => [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: "OFFICE OF THE REGISTRAR",
          bold: true,
          size: 36,
          font: FONT,
          characterSpacing: 40,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
      children: [
        new TextRun({
          text: "CERTIFICATE OF GOOD MORAL CHARACTER",
          bold: true,
          size: 28,
          font: FONT,
          characterSpacing: 30,
        }),
      ],
    }),

    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "TO WHOM IT MAY CONCERN;",
          bold: true,
          size: 24,
          font: FONT,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 360 },
      children: [
        new TextRun({ text: "This is to certify that ", size: 24, font: FONT }),
        new TextRun({ text: doc.fullName, bold: true, size: 24, font: FONT }),
        new TextRun({ text: "  was a bona fide ", size: 24, font: FONT }),
        new TextRun({
          text: doc.course || "_________________",
          bold: true,
          size: 24,
          font: FONT,
        }),
        new TextRun({
          text: " (CTP) student of this institution. She has demonstrated good moral character throughout her stay in the institution and has not been subjected to any disciplinary action for violation of the rules and regulations of the College.",
          size: 24,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 360 },
      children: [
        new TextRun({
          text: "This certification is being issued upon her request for whatever legal purpose it may serve.",
          size: 24,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400, line: 360 },
      children: [
        new TextRun({
          text: `Given this ${issuedFormal}, Parañaque City.`,
          size: 24,
          font: FONT,
        }),
      ],
    }),

    new Paragraph({
      spacing: { before: 400, after: 700 },
      children: [
        new TextRun({
          text: "CERTIFIED BY:",
          bold: true,
          size: 24,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "CHRISTIAN V. TABUGA",
          bold: true,
          size: 24,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: "College Registrar",
          size: 24,
          font: FONT,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "Not valid without the school dry seal.",
          italics: true,
          size: 24,
          font: FONT,
        }),
      ],
    }),
  ];

  const children: Paragraph[] = [];
  for (let i = 0; i < Math.max(1, doc.copies); i++) {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(...page());
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 },
          },
        },
        headers: {
          default: new Header({ children: letterhead }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "CHOOSE EXCELLENCE! CHOOSE RMC!",
                    bold: true,
                    size: 18,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}