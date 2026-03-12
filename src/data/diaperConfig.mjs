export const OFFICIAL_DIAPER_PATIENTS = [
    'Otílio Guerreiro',
    'Mário Almeida',
    'Zélia Oliveira',
    'Luísa Reis',
    'Amélia Marinho',
    'Maria Rodrigues',
    'Lourdes Correia',
    'Simão',
    'Babicha',
    'Zulmira Teixeira',
    'Carlos Almeida (Fraldas)',
    'Carlos Almeida (Cueca-fralda)',
    'Domingos Ventura',
    'Judite',
    'Teresa Almendra',
    'Lourdes Nunes',
    'Sofia Delgado',
    'Perpétua Pinto',
    'Maria Emília',
    'Ernestina Borges',
    'Fernanda Costa'
];

export const DIAPER_FLOOR_PLAN = [
    {
        id: 'piso-0',
        label: 'Piso 0',
        names: ['Otílio Guerreiro', 'Mário Almeida', 'Zélia Oliveira', 'Luísa Reis']
    },
    {
        id: 'piso-1',
        label: 'Piso 1',
        names: ['Amélia Marinho', 'Maria Rodrigues', 'Lourdes Correia', 'Simão', 'Babicha', 'Zulmira Teixeira', 'Carlos Almeida (Fraldas)', 'Carlos Almeida (Cueca-fralda)', 'Domingos Ventura']
    },
    {
        id: 'piso-2',
        label: 'Piso 2',
        names: ['Judite', 'Teresa Almendra', 'Lourdes Nunes', 'Sofia Delgado', 'Perpétua Pinto', 'Maria Emília', 'Ernestina Borges', 'Fernanda Costa']
    }
];

export const DIAPER_INVENTORY_CATALOG = [
    {
        id: 'casa-fraldas-l',
        name: 'Fraldas L',
        category: 'fralda',
        origin: 'Casa',
        patientName: null,
        stockDepot: 435,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'L'
    },
    {
        id: 'casa-fraldas-m',
        name: 'Fraldas M',
        category: 'fralda',
        origin: 'Casa',
        patientName: null,
        stockDepot: 409,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'M'
    },
    {
        id: 'casa-cueca-fralda-m',
        name: 'Cueca-Fralda M',
        category: 'fralda',
        origin: 'Casa',
        patientName: null,
        stockDepot: 135,
        packSize: 14,
        diaperKind: 'cueca-fralda',
        diaperSize: 'M'
    },
    {
        id: 'propria-amelia-fraldas-l',
        name: 'Fraldas L Amélia Marinho',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Amélia Marinho',
        stockDepot: 25,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'L'
    },
    {
        id: 'propria-judite-cueca-fralda-g',
        name: 'Cueca-Fralda G Judite',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Judite',
        stockDepot: 155,
        packSize: 14,
        diaperKind: 'cueca-fralda',
        diaperSize: 'G'
    },
    {
        id: 'propria-lourdes-nunes-cueca-fralda-g',
        name: 'Cueca-Fralda G Lourdes Nunes',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Lourdes Nunes',
        stockDepot: 40,
        packSize: 14,
        diaperKind: 'cueca-fralda',
        diaperSize: 'G'
    },
    {
        id: 'propria-maria-rodrigues-fraldas-m',
        name: 'Fraldas M Maria Rodrigues',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Maria Rodrigues',
        stockDepot: 124,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'M'
    },
    {
        id: 'propria-fernanda-costa-fraldas-m',
        name: 'Fraldas M Fernanda Costa',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Fernanda Costa',
        stockDepot: 18,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'M'
    },
    {
        id: 'propria-teresa-almendra-fraldas-m',
        name: 'Fraldas M Teresa Almendra',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Teresa Almendra',
        stockDepot: 15,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'M'
    },
    {
        id: 'propria-perpetua-pinto-fraldas-l',
        name: 'Fraldas L Perpétua Pinto',
        category: 'fralda',
        origin: 'Própria',
        patientName: 'Perpétua Pinto',
        stockDepot: 0,
        packSize: 20,
        diaperKind: 'fralda',
        diaperSize: 'L'
    }
];

const DIAPER_ASSIGNMENT_OVERRIDES = {
    'Otílio Guerreiro': { diaperId: '', origin: 'Própria' },
    'Mário Almeida': { diaperId: '', origin: 'Própria' },
    'Zélia Oliveira': { diaperId: '', origin: 'Própria' },
    'Lourdes Correia': { diaperId: '', origin: 'Própria' },
    'Maria Emília': { diaperId: '', origin: 'Própria' },
    'Babicha': { diaperId: 'casa-fraldas-l', origin: 'Casa' },
    'Amélia Marinho': { diaperId: 'propria-amelia-fraldas-l', origin: 'Própria' },
    'Luísa Reis': { diaperId: 'casa-cueca-fralda-m', origin: 'Casa' },
    'Zulmira Teixeira': { diaperId: 'casa-cueca-fralda-m', origin: 'Casa' },
    'Carlos Almeida (Cueca-fralda)': { diaperId: 'casa-cueca-fralda-m', origin: 'Casa' },
    'Judite': { diaperId: 'propria-judite-cueca-fralda-g', origin: 'Própria' },
    'Lourdes Nunes': { diaperId: 'propria-lourdes-nunes-cueca-fralda-g', origin: 'Própria' },
    'Maria Rodrigues': { diaperId: 'propria-maria-rodrigues-fraldas-m', origin: 'Própria' },
    'Fernanda Costa': { diaperId: 'propria-fernanda-costa-fraldas-m', origin: 'Própria' },
    'Teresa Almendra': { diaperId: 'propria-teresa-almendra-fraldas-m', origin: 'Própria' },
    'Perpétua Pinto': { diaperId: 'propria-perpetua-pinto-fraldas-l', origin: 'Própria', backupDiaperId: 'casa-fraldas-l' }
};

export function getPatientDiaperAssignment(patientName) {
    return DIAPER_ASSIGNMENT_OVERRIDES[patientName] || { diaperId: 'casa-fraldas-m', origin: 'Casa' };
}

export function hasExplicitDiaperAssignment(patientName) {
    return Object.prototype.hasOwnProperty.call(DIAPER_ASSIGNMENT_OVERRIDES, patientName);
}

export function getInventoryItemConfig(inventoryId) {
    return DIAPER_INVENTORY_CATALOG.find((item) => item.id === inventoryId) || null;
}

export function getPackSize(item) {
    return Number(item?.packSize || 20);
}

export function isDirectFamilySupplyPatient(patient) {
    return patient?.origin === 'Própria' && !patient?.diaperId;
}

export function sortDiaperPatientsByPlan(patients = []) {
    const plannedNames = DIAPER_FLOOR_PLAN.flatMap((floor) => floor.names);
    const byName = new Map(patients.map((patient) => [patient.name, patient]));
    const plannedPatients = plannedNames.map((name) => byName.get(name)).filter(Boolean);
    const extraPatients = patients
        .filter((patient) => !plannedNames.includes(patient.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    return [...plannedPatients, ...extraPatients];
}
