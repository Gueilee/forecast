export interface TvMonthly {
  month: number
  short: string
  plan: number
  fc: number
  realizado: number
}

export interface TvEntity {
  entity: string
  planYtd: number
  fcYtd: number
  realizadoYtd: number
  atingimento: number
  planMonth: number
  fcMonth: number
  realizadoMonth: number
}

export interface TvClient {
  clientId: string
  name: string
  nameReduced: string
  entity: string
  realizadoYtd: number
  planYtd: number
  atingimento: number
}

export interface TvData {
  year: number
  currentMonth: number
  currentMonthName: string
  // Anual
  planYear: number
  fcYear: number
  realizadoYtd: number
  planYtd: number
  atingimentoYtd: number
  marginYtd: number
  marginPct: number
  // Mês atual
  planMonth: number
  fcMonth: number
  realizadoMonth: number
  atingimentoMonth: number
  // Séries
  monthly: TvMonthly[]
  entities: TvEntity[]
  topClients: TvClient[]
  updatedAt: string
}
