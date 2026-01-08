export function downloadSampleBoM() {
  const sampleBomCSV = `Part Number,Description,Quantity,Material,Supplier
SEN-BLADE-001,Blad3 Assembly,3,Carbon Fibr,WindTech GmbH
SEN-GRBX-002,grbx Main Unit,1,Steel Alloy,PowerDrive Corp
SEN-GEN-003,Generater 3.5MW,1,Copper/Steel,ElectroWind Ltd
SEN-TOWER-004,Tower Secton Base,1,Structural Steel,SteelWorks AG
SEN-NACELLE-005,Nacel Housing,1,Fiberglass,CompositesPro
SEN-ROTOR-006,Rotor Hub Assmbly,1,Cast Iron,MetalCast Industries
SEN-CTRL-007,Control Systm Unit,1,Electronics,AutoControl Systems
SEN-BRAKE-008,Braking Sytem,2,Steel/Hydraulic,SafetyFirst GmbH`;

  downloadFile(sampleBomCSV, 'sample-bom-senvion.csv', 'text/csv');
}

export function downloadSampleDictionary() {
  const dictionary = {
    approved_terms: {
      blade: ["blade", "rotor blade", "wind turbine blade"],
      gearbox: ["gearbox", "gear box", "transmission"],
      generator: ["generator", "electrical generator"],
      nacelle: ["nacelle", "nacelle housing"],
      tower: ["tower", "tower section", "support structure"],
      rotor: ["rotor", "rotor hub", "rotor assembly"],
      control: ["control system", "controller", "control unit"],
      brake: ["braking system", "brake", "brake assembly"]
    },
    forbidden_abbreviations: [
      "grbx",
      "gen",
      "nacel",
      "ctrl",
      "assmbly"
    ],
    material_standards: {
      "Carbon Fiber": "Carbon Fibre Composite",
      "Steel": "Structural Steel",
      "Copper": "High-Grade Copper"
    },
    common_errors: {
      "Blad3": "Blade 3",
      "grbx": "Gearbox",
      "Generater": "Generator",
      "Secton": "Section",
      "Nacel": "Nacelle",
      "Assmbly": "Assembly",
      "Systm": "System",
      "Sytem": "System",
      "Fibr": "Fibre"
    }
  };

  downloadFile(
    JSON.stringify(dictionary, null, 2),
    'senvion-terminology-dictionary.json',
    'application/json'
  );
}

export function downloadSampleStandards() {
  const standards = {
    naming_conventions: {
      part_number_format: "SEN-[COMPONENT]-[NUMBER]",
      description_rules: [
        "Use full words, no abbreviations",
        "Capitalize first letter of each word",
        "Include model/size where applicable"
      ]
    },
    quality_requirements: {
      min_description_length: 10,
      required_fields: [
        "Part Number",
        "Description",
        "Quantity",
        "Material",
        "Supplier"
      ],
      material_compliance: true
    },
    engineering_standards: {
      IEC_61400: {
        title: "Wind Turbine Design Requirements",
        version: "4.0",
        applies_to: ["Blade", "Tower", "Foundation"]
      },
      ISO_9001: {
        title: "Quality Management Systems",
        version: "2015",
        applies_to: ["All Components"]
      },
      DIN_EN_1993: {
        title: "Eurocode 3: Design of Steel Structures",
        version: "2010",
        applies_to: ["Tower", "Foundation", "Structural Components"]
      }
    },
    validation_rules: {
      spelling_check: true,
      terminology_compliance: true,
      format_validation: true,
      material_verification: true
    }
  };

  downloadFile(
    JSON.stringify(standards, null, 2),
    'senvion-internal-standards.json',
    'application/json'
  );
}

export function downloadSampleBomRules() {
  const bomRules = {
    validation_rules: {
      part_number: {
        pattern: "^SEN-[A-Z]+-\\d{3}$",
        required: true,
        unique: true
      },
      description: {
        min_length: 10,
        max_length: 100,
        no_abbreviations: true,
        proper_capitalization: true
      },
      quantity: {
        type: "number",
        min_value: 1,
        required: true
      },
      material: {
        must_match_dictionary: true,
        required: true
      },
      supplier: {
        min_length: 5,
        required: true
      }
    },
    correction_priorities: [
      {
        priority: 1,
        type: "spelling",
        auto_correct: true
      },
      {
        priority: 2,
        type: "abbreviation",
        auto_correct: true
      },
      {
        priority: 3,
        type: "terminology",
        auto_correct: true
      },
      {
        priority: 4,
        type: "format",
        auto_correct: false
      }
    ],
    quality_scoring: {
      perfect_score: 100,
      deductions: {
        spelling_error: 5,
        abbreviation: 3,
        terminology_violation: 10,
        missing_field: 20,
        format_error: 7
      }
    }
  };

  downloadFile(
    JSON.stringify(bomRules, null, 2),
    'senvion-bom-validation-rules.json',
    'application/json'
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
