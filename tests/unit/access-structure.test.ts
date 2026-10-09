/*
 * Structural security checks: every Administration / CEO Studio page and API
 * route calls the right server-side guard, secrets stay server-side, and the
 * old hard-coded phase code is gone. (Behavior of the guards themselves is
 * covered by the policy tests and the integration tests.)
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";

const root = process.cwd();

function files(dir: string, match: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir))) {
    const path = join(dir, entry);
    if (statSync(join(root, path)).isDirectory()) out.push(...files(path, match));
    else if (match.test(entry)) out.push(path);
  }
  return out;
}

const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Administration and CEO Studio access", () => {
  test("every Administration page checks BOARD+ on the server", () => {
    const pages = files("app/administration", /^(page|layout)\.tsx$/);
    assert.ok(pages.length >= 7);
    for (const page of pages) assert.match(read(page), /requireAdministrationPage\(/, page);
  });

  test("every CEO Studio page checks CEO on the server", () => {
    const pages = files("app/ceo-studio", /^page\.tsx$/);
    assert.ok(pages.length >= 2);
    for (const page of pages) assert.match(read(page), /requireCEOPage\(/, page);
  });

  test("admin APIs require BOARD (CEO for roles and renovation); CEO APIs require CEO", () => {
    for (const route of files("app/api/admin", /^route\.ts$/)) {
      const source = read(route);
      const ceoOnly = /\/role\/|renovation/.test(route.replace(/\\/g, "/"));
      if (ceoOnly) assert.match(source, /requireApiCEO\(\)/, route);
      else assert.match(source, /requireApiRole\("BOARD"\)|requireApiCEO\(\)/, route);
    }
    for (const route of files("app/api/ceo", /^route\.ts$/)) assert.match(read(route), /requireApiCEO\(\)/, route);
  });

  test("CEO-password routes verify the password on the server before acting", () => {
    for (const route of ["app/api/admin/members/[memberId]/role/route.ts", "app/api/ceo/phases/[phase]/activate/route.ts"]) {
      const source = read(route);
      const guard = source.indexOf("await requireApiCEO()");
      const password = source.indexOf("await checkCeoPassword(");
      const action = Math.max(source.indexOf("await changeMemberRole("), source.indexOf("await activatePhase("));
      assert.ok(guard > 0 && password > guard && action > password, route);
    }
  });

  test("requireApiUser enforces restrictions and renovation for every signed-in API", () => {
    const guards = read("lib/auth/guards.ts");
    assert.match(guards, /user\.restriction/);
    assert.match(guards, /isRenovationMode\(\)/);
  });

  test("API routes that use auth() directly are only the session endpoints", () => {
    for (const route of files("app/api", /^route\.ts$/)) {
      if (/await auth\(\)/.test(read(route))) {
        assert.match(relative(root, join(root, route)).replace(/\\/g, "/"), /^app\/api\/auth\/(me|validate)\//, route);
      }
    }
  });
});

describe("series follows", () => {
  test("every follow / library route signs the caller in with requireApiUser and takes no user id", () => {
    const routes = files("app/api/me/follows", /^route\.ts$/);
    assert.ok(routes.length >= 2);
    for (const route of routes) {
      const source = read(route);
      for (const handler of source.match(/export async function \w+/g) ?? []) {
        const body = source.slice(source.indexOf(handler));
        assert.match(body, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, `${route} ${handler}`);
      }
      assert.doesNotMatch(source, /params\.userId|body\.userId|searchParams/, route);
    }
  });

  test("profile editor routes act only as the signed-in member", () => {
    for (const route of ["app/api/me/profile/route.ts", "app/api/me/profile-images/route.ts", "app/api/avatars/library/route.ts"]) {
      const source = read(route);
      assert.match(source, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, route);
      assert.doesNotMatch(source, /params\.userId|body\.data\.userId|searchParams/, route);
    }
    // The profile picture is chosen from the library, and library images are never deleted as "replaced".
    const images = read("app/api/me/profile-images/route.ts");
    assert.match(images, /isLibraryAvatarUrl\(/);
    assert.match(images, /isLibraryImagePath\(current\.image\)/);
  });

  test("nothing writes Series.followers by hand (the database trigger owns it)", () => {
    for (const file of [...files("app", /\.(ts|tsx)$/), ...files("lib", /\.ts$/)]) {
      assert.doesNotMatch(read(file), /followers\s*:\s*\{\s*(increment|decrement)|data:\s*\{[^}]*\bfollowers\s*:/, file);
    }
  });
});

describe("secrets", () => {
  test("the CEO password is read only on the server, never through NEXT_PUBLIC_", () => {
    for (const file of [...files("app", /\.(ts|tsx)$/), ...files("components", /\.(ts|tsx)$/), ...files("lib", /\.(ts|tsx)$/)]) {
      const source = read(file);
      assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z_]*CEO/, file);
      assert.doesNotMatch(source, /DEV_CEO_PASSWORD/, file);
      if (/^\s*["']use client["']/m.test(source)) assert.doesNotMatch(source, /CEO_PASSWORD/, file);
    }
  });

  test("the old hard-coded phase unlock code is gone", () => {
    for (const file of files("lib", /\.ts$/)) assert.doesNotMatch(read(file), /PHASE_UNLOCK_CODE|"0424"/, file);
  });

  test("the CEO password is never logged", () => {
    for (const file of ["lib/admin/audit.ts", "lib/admin/ceo-password.ts", "app/api/admin/members/[memberId]/role/route.ts", "app/api/ceo/phases/[phase]/activate/route.ts"]) {
      // A password value passed as an argument (not merely mentioned inside a message string).
      assert.doesNotMatch(read(file), /console\.\w+\([^)]*[(,]\s*(body\.data\.ceoPassword|ceoPassword|submitted|configured)\b/, file);
    }
  });
});
