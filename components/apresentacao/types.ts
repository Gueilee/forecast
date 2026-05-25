export interface MonthlyPoint {
  month: number
  name: string
  short: string
  plan: number
  fc: number
  realizado: number
  marginLiquid: number
}

export interface EntitySummary {
  entity: string
  planYear: number
  fcYear: number
  planYtd: number
  realizadoYtd: number
  atingimento: number
  clientCount: number
}

export interface EntityMonthlyPoint {
  entity: string
  month: number
  plan: number
  fc: number
  realizado: number
}

export interface TopClient {
  entity: string
  clientId: string
  name: string
  nameReduced: string
  planYtd: number
  realizadoYtd: number
  atingimento: number
}

export interface PresentationData {
  year: number
  monthly: MonthlyPoint[]
  entities: EntitySummary[]
  entityMonthly: EntityMonthlyPoint[]
  topClients: TopClient[]
}

export interface SlideProps {
  data: PresentationData
  month: number
}
