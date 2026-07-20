import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FX_DEFAULT, fxDefaultAttr, FX_BOOT_SCRIPT } from "@/lib/fx";

/** Ejecuta el script de arranque con una URL dada (inyecta `location`). */
function runBoot(search: string) {
  new Function("location", FX_BOOT_SCRIPT)({ search });
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.fx;
});

afterEach(() => {
  delete document.documentElement.dataset.fx;
});

describe("fxDefaultAttr", () => {
  it("el default vigente es null (todo prendido): sin atributo data-fx", () => {
    expect(FX_DEFAULT).toBeNull();
    expect(fxDefaultAttr()).toEqual({});
  });

  it("con un valor (modo paliativo, p.ej. 'css') emite el atributo", () => {
    expect(fxDefaultAttr("css")).toEqual({ "data-fx": "css" });
  });
});

describe("FX_BOOT_SCRIPT", () => {
  it("sin params respeta el data-fx que puso el server", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("css");
  });

  it("?sinfx=1 apaga todo", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?sinfx=1");
    expect(document.documentElement.dataset.fx).toBe("");
  });

  it("?fx=trail,css prende solo esos", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?fx=trail,css");
    expect(document.documentElement.dataset.fx).toBe("trail css");
  });

  it("?fx=on borra el atributo (todo prendido)", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?fx=on");
    expect(document.documentElement.dataset.fx).toBeUndefined();
  });

  it("el flag aruma-fx-off del watchdog apaga todo si no hay params", () => {
    document.documentElement.dataset.fx = "css";
    localStorage.setItem("aruma-fx-off", String(Date.now()));
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("");
  });

  it("el flag vencido (>24h) no hace nada", () => {
    document.documentElement.dataset.fx = "css";
    localStorage.setItem("aruma-fx-off", String(Date.now() - 25 * 60 * 60 * 1000));
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("css");
  });
});
