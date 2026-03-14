export const planoDiarioTemplate = {
    id: "plano_diario_v1",
    name: "Plano Individual de Trabalho Diário",
    blocks: [
        {
            id: "levante",
            name: "Levante (8h–10:30h)",
            type: "group_assignment",
            time: "Manhã",
            columns: ["Responsável 1", "Responsável 2"],
            predefinedColumns: {
                0: ["António", "Simão", "Carlos A.", "Conceição", "M. Zélia", "Mário"],
                1: ["Teresa", "Babixa", "Judite", "José Carlos", "Ventura", "Otílio"]
            }
        },
        {
            id: "trocas_11",
            name: "Trocas das 11H",
            type: "group_assignment",
            time: "11:00",
            columns: ["Área 1", "Área 2"],
            predefinedColumns: {
                0: ["Lurdes N", "Fernanda", "Simão", "Mário", "Sofia", "Perpétua", "Amélia"],
                1: ["Lurdes C", "Tina", "Luísa", "Ventura", "Babixa", "M. Rodrigues", "Carlos A."]
            }
        },
        {
            id: "trocas_15",
            name: "Trocas das 15H",
            type: "group_assignment",
            time: "15:00",
            columns: ["Área 1", "Área 2"],
            predefinedColumns: {
                0: ["Lurdes N", "Fernanda", "Simão", "Mário", "Sofia", "Perpétua", "Amélia"],
                1: ["Lurdes C", "Tina", "Luísa", "Ventura", "Babixa", "M. Rodrigues", "Carlos A."]
            }
        },
        {
            id: "trocas_18",
            name: "Trocas das 18H",
            type: "group_assignment",
            time: "18:00",
            columns: ["Área 1", "Área 2"],
            predefinedColumns: {
                0: ["Lurdes N", "Fernanda", "Simão", "Mário", "Sofia", "Perpétua", "Amélia"],
                1: ["Lurdes C", "Tina", "Luísa", "Ventura", "Babixa", "M. Rodrigues", "Carlos A."]
            }
        },
        {
            id: "deitar",
            name: "Deitares (19h–20h)",
            type: "group_assignment",
            time: "Tarde",
            columns: ["Responsável 1", "Responsável 2"],
            predefinedColumns: {
                0: ["Perpétua", "Amélia", "Otílio"],
                1: ["Ventura", "Babixa"]
            }
        },
        {
            id: "gerais",
            name: "Tarefas Gerais",
            type: "geral",
            items: [
                { id: "G_RepFraldas", label: "Reposição de Fraldas" },
                { id: "G_LivroUtentes", label: "Preenchimento livro utentes" },
                { id: "G_Telefone", label: "Responsável pelo telefone da casa", assigneeCount: 2, slotLabels: ["Manhã", "Tarde"] },
                { id: "G_Reforco1030", label: "Reforço Hídrico (Manhã às 10:30h)", time: "10:30" },
                { id: "G_Reforco1700", label: "Reforço Hídrico (Tarde às 17h)", time: "17:00" },
                { id: "G_Hidratacao", label: "Hidratação Pele" },
                { id: "G_Barbas", label: "Barbas" },
                { id: "G_Unhas", label: "Unhas" },
                { id: "G_Pesos", label: "Pesos" },
                { id: "G_Roupeiros", label: "Roupeiros", residentSelection: true },
                { id: "G_Servicos", label: "Serviços Gerais" },
                { id: "G_Roupa12", label: "Roupa (Manhã até 12h)", time: "12:00" },
                { id: "G_RoupaApos12", label: "Roupa (Tarde após 12h)" },
                { id: "G_CozManha", label: "Cozinha (Manhã)", time: "Manhã" },
                { id: "G_CozTarde", label: "Cozinha (Tarde)", time: "Tarde" },
                { id: "G_SinaisVitais", label: "Sinais Vitais" },
                { id: "G_Insulinas", label: "Administração Terapêutica / Insulinas", assigneeCount: 2, slotLabels: ["Manhã", "Tarde"] },
                { id: "G_Adicionar1", label: "+ Adicionar Nova Tarefa", isExtra: true },
                { id: "G_Adicionar2", label: "+ Adicionar Nova Tarefa", isExtra: true },
                { id: "G_Adicionar3", label: "+ Adicionar Nova Tarefa", isExtra: true },
            ]
        }
    ]
};

export const planoDiarioNoturnoTemplate = {
    id: "tpl_night_v1",
    name: "Plano Individual de trabalho Noturno",
    blocks: [
        {
            id: "night_levantes",
            name: "LEVANTES",
            type: "group_assignment",
            columns: ["Coluna 1", "Coluna 2"],
            predefinedColumns: [
                ["Amélia", "Fernanda", "Emília", "Perpétua", "Maria", "M. Rodrigues"],
                ["Sofia", "Lurdes N.", "Lurdes C.", "Luísa", "Tina"]
            ],
            residents: [
                "Amélia", "Fernanda", "Emília", "Perpétua", "Maria",
                "M. Rodrigues", "Sofia", "Lurdes N.", "Lurdes C.", "Luísa", "Tina"
            ]
        },
        {
            id: "night_deitares",
            name: "DEITARES",
            type: "group_assignment",
            columns: ["Coluna 1", "Coluna 2"],
            predefinedColumns: [
                ["Sofia", "Amélia", "José Carlos", "Luísa", "Teresa", "Tina", "Conceição", "Mário"],
                ["Simão", "Júlio", "Judite", "Fernanda C.", "Maria", "M. Rodrigues", "M. Zélia"]
            ],
            residents: [
                "Sofia", "Amélia", "José Carlos", "Luísa", "Teresa",
                "Tina", "Conceição", "Mário", "Simão", "Júlio",
                "Judite", "Fernanda C.", "Maria", "M. Rodrigues", "M. Zélia"
            ]
        },
        {
            id: "night_gerais",
            name: "Tarefas Noturnas",
            type: "single_assignment",
            items: [
                { id: "night_roupeiros", label: "Roupeiros" },
                { id: "night_limpeza_salao", label: "Limpeza Salão" },
                { id: "night_roupa_passar_ferro", label: "Roupa (Passar a Ferro)" },
                { id: "night_admin_terapeutica_insulinas", label: "Administração terapêutica / Insulinas" }
            ]
        }
    ]
};
