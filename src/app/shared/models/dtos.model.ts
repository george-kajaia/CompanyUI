export interface LoginCredentialDto {
  userName: string;
  password: string;
}

// Matches ServiceTokenApi.Dto.CompanyRequestDto
export interface CompanyRequestDto {
  name: string;
  taxCode: string;
  address: string;
  legalForm: number;        // byte on the API; FK -> LegalFormDomain.Id
  economicActivity: number; // int on the API;  FK -> EconomicActivityDomain.Id
  mail: string;
  phone: string;
  userName: string;
  password: string;
}

// Generic lookup item for *Domain tables (Id, Name).
// Used to populate the Legal Form / Economic Activity dropdowns.
export interface DomainItemDto {
  id: number;
  name: string;
}

// Matches ServiceTokenApi.Dto.InvestorCreateDto (entity fields)
export interface InvestorCreateDto {
  publicKey: string;
  userName: string;
  password: string;
}

// Matches ServiceTokenApi.Dto.RequestDto
export interface RequestDto {
  companyId: number;
  productId: number;
  serviceTokenCount: number;
}
