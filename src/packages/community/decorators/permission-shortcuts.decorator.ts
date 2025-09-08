import { RequirePermissions } from './require-permissions.decorator';
import { GuildPermissions } from '../constants/guild-permissions';

// Decorator shortcuts for common permissions
export const RequireManageRoles = () =>
  RequirePermissions(GuildPermissions.MANAGE_ROLES);
export const RequireManageGuild = () =>
  RequirePermissions(GuildPermissions.MANAGE_GUILD);
export const RequireAdministrator = () =>
  RequirePermissions(GuildPermissions.ADMINISTRATOR);
export const RequireKickMembers = () =>
  RequirePermissions(GuildPermissions.KICK_MEMBERS);
export const RequireBanMembers = () =>
  RequirePermissions(GuildPermissions.BAN_MEMBERS);
export const RequireManageChannels = () =>
  RequirePermissions(GuildPermissions.MANAGE_CHANNELS);
export const RequireManageMessages = () =>
  RequirePermissions(GuildPermissions.MANAGE_MESSAGES);

// Decorator for multiple permissions (user needs ANY of these)
export const RequireAnyPermission = (...permissions: bigint[]) =>
  RequirePermissions(...permissions);

// Decorator for mod permissions (kick or ban or manage roles)
export const RequireModPermissions = () =>
  RequirePermissions(
    GuildPermissions.KICK_MEMBERS,
    GuildPermissions.BAN_MEMBERS,
    GuildPermissions.MANAGE_ROLES,
    GuildPermissions.ADMINISTRATOR,
  );
