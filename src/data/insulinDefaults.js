export const defaultInsulinPatients = [
    {
        id: 'insulin-judite',
        name: 'Judite',
        active: true,
        notes: 'Registo diário de insulina'
    },
    {
        id: 'insulin-lourdes-correia',
        name: 'Lourdes Correia',
        active: true,
        notes: 'Registo diário de insulina'
    }
];

export function mergeInsulinPatients(savedPatients = []) {
    const savedByName = new Map(savedPatients.map((patient) => [patient.name?.trim().toLowerCase(), patient]));
    const merged = [...savedPatients];

    defaultInsulinPatients.forEach((patient) => {
        const key = patient.name.trim().toLowerCase();
        if (!savedByName.has(key)) {
            merged.push(patient);
        }
    });

    return merged
        .filter((patient) => patient.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
}
