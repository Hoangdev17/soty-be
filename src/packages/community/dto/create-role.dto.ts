export class CreateRoleDto {
  name: string;
  permissions: string[];
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
}

export class UpdateRoleDto {
  name?: string;
  permissions?: string[];
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
}
