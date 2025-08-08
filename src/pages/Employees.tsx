import { useCallback, useMemo, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { toast } from "sonner";

export default function Employees() {
  const { state, dispatch } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const employees = useMemo(() => {
    const q = state.filters.query.toLowerCase();
    return state.employees.filter(e => `${e.name} ${e.employeeId} ${e.facility} ${e.area}`.toLowerCase().includes(q));
  }, [state.employees, state.filters.query]);

  const onImport = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        toast.success(`Parsed ${rows.length} rows from CSV`);
        // Map to Employee as needed in future iterations
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1>Employees</h1>
      </header>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, ID, facility, area"
          value={state.filters.query}
          onChange={(e) => dispatch({ type: "setQuery", payload: e.target.value })}
          className="w-full sm:max-w-sm"
        />
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files && onImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Import CSV</Button>
          <Button variant="secondary">Export</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Care Partner</TableHead>
              <TableHead>Associate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.employeeId}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{e.employeeId}</TableCell>
                <TableCell>{e.facility}</TableCell>
                <TableCell>{e.area}</TableCell>
                <TableCell>{e.level1ReliasCompleted ? "Completed" : "Pending"}</TableCell>
                <TableCell>{e.secureCareAssociateAwarded ? "Awarded" : "In progress"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
