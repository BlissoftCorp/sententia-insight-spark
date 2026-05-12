export type UserRow = {
  id: string;
  name: string;
  email: string;
  queries: number;
  tokens: number;
  lastSession: string; // ISO
  createdAt: string; // ISO
};

export const MOCK_USERS: UserRow[] = [
  { id: "u_001", name: "Blue pick media", email: "xhergio11@gmail.com", queries: 0, tokens: 0, lastSession: "2025-11-20T00:20:01Z", createdAt: "2025-11-20T00:20:00Z" },
  { id: "u_002", name: "Tangram", email: "colectivo.digitalco@gmail.com", queries: 4, tokens: 3_120, lastSession: "2025-12-12T11:23:05Z", createdAt: "2025-06-06T11:20:45Z" },
  { id: "u_003", name: "alejooaj", email: "alejooaj@gmail.com", queries: 128, tokens: 96_540, lastSession: "2026-05-12T13:49:00Z", createdAt: "2026-02-18T04:05:54Z" },
  { id: "u_004", name: "VOREX", email: "ramonbuenorubio@gmail.com", queries: 87, tokens: 71_220, lastSession: "2025-07-24T19:32:31Z", createdAt: "2025-02-05T15:59:44Z" },
  { id: "u_005", name: "VRmarket", email: "vrmarketsoporte@gmail.com", queries: 312, tokens: 248_910, lastSession: "2025-07-03T21:50:01Z", createdAt: "2025-02-07T11:09:01Z" },
  { id: "u_006", name: "Juan Carlos", email: "millonarioabundante09@gmail.com", queries: 56, tokens: 42_180, lastSession: "2026-04-26T16:12:05Z", createdAt: "2024-10-06T20:16:29Z" },
  { id: "u_007", name: "vidadedamasofi", email: "andresquimbayo987@gmail.com", queries: 19, tokens: 14_760, lastSession: "2025-03-28T16:37:34Z", createdAt: "2025-03-28T15:42:35Z" },
  { id: "u_008", name: "El poder del ahora", email: "Gonzaleznia2025@outlook.com", queries: 0, tokens: 0, lastSession: "2025-06-27T16:09:33Z", createdAt: "2025-06-24T18:41:17Z" },
  { id: "u_009", name: "Marcela Ríos", email: "marcela.rios@hotmail.com", queries: 245, tokens: 189_330, lastSession: "2026-05-09T08:14:22Z", createdAt: "2025-01-14T09:02:11Z" },
  { id: "u_010", name: "NeuralForge", email: "hello@neuralforge.io", queries: 1_204, tokens: 982_410, lastSession: "2026-05-11T22:08:10Z", createdAt: "2024-08-30T13:45:12Z" },
  { id: "u_011", name: "Daniel Ortega", email: "danielortega.dev@gmail.com", queries: 73, tokens: 58_220, lastSession: "2026-05-10T19:01:48Z", createdAt: "2025-11-02T10:24:00Z" },
  { id: "u_012", name: "Studio Norte", email: "contacto@studionorte.co", queries: 411, tokens: 327_640, lastSession: "2026-05-08T15:33:09Z", createdAt: "2025-04-19T17:11:54Z" },
  { id: "u_013", name: "Laura M.", email: "lauramedina@gmail.com", queries: 12, tokens: 9_180, lastSession: "2026-04-30T11:42:00Z", createdAt: "2026-04-28T18:33:21Z" },
  { id: "u_014", name: "Cosmos AI", email: "team@cosmos.ai", queries: 698, tokens: 552_310, lastSession: "2026-05-12T07:55:41Z", createdAt: "2024-12-12T20:00:00Z" },
  { id: "u_015", name: "Pablo Restrepo", email: "pablo.restrepo@outlook.com", queries: 33, tokens: 25_940, lastSession: "2025-12-21T13:18:55Z", createdAt: "2025-09-09T09:09:09Z" },
];
