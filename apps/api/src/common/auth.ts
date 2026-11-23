import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Global,
  Injectable,
  Module,
  UnauthorizedException,
} from "@nestjs/common";
export type Identity = { id: string; role: "customer" | "catalog" | "admin" };
export function identity(token?: string): Identity {
  if (
    process.env.DEMO_MODE !== "true" ||
    !["development", "test"].includes(process.env.NODE_ENV ?? "")
  )
    throw new UnauthorizedException("Demo identities are disabled");
  const identities: Record<string, Identity> = {
    "Bearer demo-customer-a": { id: "customer-a", role: "customer" },
    "Bearer demo-customer-b": { id: "customer-b", role: "customer" },
    "Bearer demo-catalog": { id: "catalog-manager", role: "catalog" },
    "Bearer demo-admin": { id: "system-admin", role: "admin" },
  };
  if (!token || !Object.hasOwn(identities, token))
    throw new UnauthorizedException("Select a local demo identity");
  return identities[token];
}
@Injectable()
export class IdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.identity = identity(request.headers.authorization);
    return true;
  }
}
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.identity = identity(request.headers.authorization);
    if (!["catalog", "admin"].includes(request.identity.role))
      throw new ForbiddenException("Staff permission required");
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.identity = identity(request.headers.authorization);
    if (request.identity.role !== "admin")
      throw new ForbiddenException("Administrator permission required");
    return true;
  }
}
@Global()
@Module({
  providers: [IdentityGuard, StaffGuard, AdminGuard],
  exports: [IdentityGuard, StaffGuard, AdminGuard],
})
export class AuthenticationModule {}
