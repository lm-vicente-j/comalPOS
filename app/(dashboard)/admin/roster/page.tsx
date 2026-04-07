"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSalaryHistory, saveSalaryPayment } from "@/lib/actions/payrolls";
import { GetAllUsers } from "@/lib/actions/users";
import { User, Salary } from "@/lib/actions/schemas";
import { format } from "date-fns";

export default function RosterPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserID, setSelectedUserID] = useState<string>("");
  const [history, setHistory] = useState<Salary[]>([]);
  
  // Form states
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Fetch users on mount
  useEffect(() => {
    GetAllUsers().then((data) => setUsers(data as User[]));
  }, []);

  // Fetch history when user changes
  useEffect(() => {
    if (selectedUserID) {
      getSalaryHistory(parseInt(selectedUserID)).then(setHistory);
    }
  }, [selectedUserID]);

  const selectedUser = users.find(u => u.id === parseInt(selectedUserID));

  const handlePayment = async (type: "ADELANTO" | "BONO" | "SUELDO") => {
    if (!selectedUserID || !amount) return alert("Seleccione usuario y monto");

    const res = await saveSalaryPayment({
      userID: parseInt(selectedUserID),
      amount: parseFloat(amount),
      period: `${type}: ${reason}`
    });

    if (res.success) {
      setAmount("");
      setReason("");
      // Refresh history
      const updatedHistory = await getSalaryHistory(parseInt(selectedUserID));
      setHistory(updatedHistory);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full p-4">
      <div className="flex flex-col items-center justify-around h-full outline rounded-md bg-white w-full max-w-6xl p-6">
        
        {/* User Selection */}
        <div className="w-full mb-6">
          <Select onValueChange={setSelectedUserID} value={selectedUserID}>
            <SelectTrigger className="w-75">
              <SelectValue placeholder="Seleccionar Empleado" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name} (@{user.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full h-full flex flex-row gap-6">
          {/* Controls */}
          <div className="h-full w-1/2 flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label>Monto</Label>
                <Input 
                  type="number" 
                  placeholder="$0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Motivo / Descripción</Label>
                <Input 
                  placeholder="Ej: Bono por puntualidad" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => handlePayment("ADELANTO")} variant="outline">Adelantar Sueldo</Button>
              <Button onClick={() => handlePayment("BONO")} className="bg-amber-500 hover:bg-amber-400">Otorgar Bono</Button>
              <Button onClick={() => handlePayment("SUELDO")}>Registrar Pago de Sueldo</Button>
            </div>
          </div>

          <Separator orientation="vertical" />

          {/* Info & History */}
          <div className="h-full w-1/2 flex flex-col gap-5">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="font-bold">Nombre: <span className="font-normal">{selectedUser?.name || "---"}</span></p>
              <p className="font-bold">Fecha de ingreso: <span className="font-normal">
                {selectedUser?.registeredAt ? format(new Date(selectedUser.registeredAt), "PPP") : "---"}
              </span></p>
            </div>

            <ScrollArea className="h-100 w-full rounded-md border p-4 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.payDate ? format(new Date(item.payDate), "dd/MM/yyyy") : "---"}</TableCell>
                      <TableCell className="text-xs">{item.period}</TableCell>
                      <TableCell className="text-right">${item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Label component helper
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium leading-none">{children}</label>;
}