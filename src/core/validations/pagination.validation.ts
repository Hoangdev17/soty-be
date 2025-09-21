export class PaginationDto {
  offset?: number = 0;
  limit?: number = 10;
  q?: string;
  sort?: string;
  order?: string;
  minPrice?: number;
  maxPrice?: number;
}
