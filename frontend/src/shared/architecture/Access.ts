export enum ArchitectureRole {
  Owner = "owner",
  Editor = "editor",
  Viewer = "viewer",
}

export enum GeneralAccess {
  Public = "public",
  Restricted = "restricted",
  Organization = "organization",
}

export const publicUserId = "user:*";

export interface ArchitectureAccess {
  canShare?: boolean;
  architectureId: string;
  entities: ArchitectureAccessEntity[];
  generalAccess: {
    type: GeneralAccess;
    entity?: {
      id: string;
      role: ArchitectureRole;
    };
  };
}

export interface ArchitectureAccessEntity {
  id: string;
  role: ArchitectureRole;
  type: "user" | "team" | "organization";
  givenName?: string;
  familyName?: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
  picture?: string;
}

export function parseEntities(data: any): ArchitectureAccess {
  const entities: ArchitectureAccessEntity[] = [];
  for (const entity of data.entities) {
    entities.push({
      id: entity.id,
      role: entity.role,
      type: entity.type,
      givenName: entity.given_name,
      familyName: entity.family_name,
      email: entity.email,
      name: entity.name,
      emailVerified: entity.email_verified,
      picture: entity.picture,
    });
  }

  return {
    architectureId: data.architecture_id,
    canShare: data.can_share,
    entities,
    generalAccess: data.general_access,
  };
}
