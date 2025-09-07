import { PartialType } from '@nestjs/swagger';
import { CreateServerRoleDto } from './create-server-role.dto';

export class UpdateServerRoleDto extends PartialType(CreateServerRoleDto) {}
