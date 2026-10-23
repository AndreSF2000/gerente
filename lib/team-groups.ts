import type { Employee } from "./types";

export type EmployeeGroup = {
  key: "pizzaiolos" | "others";
  label: string;
  employees: Employee[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** A função é texto livre; basta conter "pizzaiol" (pizzaiolo/pizzaiola). */
export function isPizzaiolo(employee: Employee): boolean {
  return normalize(employee.role).includes("pizzaiol");
}

/**
 * Coloca os pizzaiolos primeiro e junta todos os outros colaboradores num
 * segundo grupo. A ordem dentro de cada grupo mantém-se a da equipa.
 */
export function groupEmployees(employees: Employee[]): EmployeeGroup[] {
  const pizzaiolos: Employee[] = [];
  const others: Employee[] = [];

  for (const employee of employees) {
    if (isPizzaiolo(employee)) {
      pizzaiolos.push(employee);
    } else {
      others.push(employee);
    }
  }

  const groups: EmployeeGroup[] = [];
  if (pizzaiolos.length > 0) {
    groups.push({
      key: "pizzaiolos",
      label: "Pizzaiolos",
      employees: pizzaiolos,
    });
  }
  if (others.length > 0) {
    groups.push({
      key: "others",
      label: "Outros colaboradores",
      employees: others,
    });
  }
  return groups;
}

/** Só vale a pena mostrar cabeçalhos quando há os dois grupos. */
export function hasEmployeeGroups(groups: EmployeeGroup[]): boolean {
  return groups.length > 1;
}
