"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

import { getSalaryHistory, saveSalaryPayment } from "@/lib/actions/payrolls";
import { searchUsers } from "@/lib/actions/users";
import { Salary } from "@/lib/actions/schemas";
import { format } from "date-fns";

const PAGE_SIZE = 30;

type RosterUser = Awaited<ReturnType<typeof searchUsers>>[number];

export default function RosterPage() {
  const [users, setUsers] = useState<RosterUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RosterUser | null>(null);
  const [history, setHistory] = useState<Salary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Debounced server-side search so the picker scales to thousands of employees.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userQuery).then(setUsers);
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery]);

  // Fetch the first page of history when user changes
  useEffect(() => {
    if (selectedUser?.id) {
      getSalaryHistory(selectedUser.id, 0, PAGE_SIZE).then((res) => {
        setHistory(res.items);
        setHasMore(res.hasMore);
      });
    }
  }, [selectedUser?.id]);

  const loadMoreHistory = async () => {
    if (!selectedUser?.id) return;
    setLoadingMore(true);
    const res = await getSalaryHistory(selectedUser.id, history.length, PAGE_SIZE);
    setHistory((prev) => [...prev, ...res.items]);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  };

  const handlePayment = async (type: "ADELANTO" | "BONO" | "SUELDO") => {

    setErrors({});
    setAlert(null);


    if (!selectedUser?.id) {
      setErrors({ userID: ["Seleccione un empleado"] });
      return;
    }
    if (!amount) {
      setErrors({ amount: ["Ingrese un monto"] });
      return;
    }

    const res = await saveSalaryPayment({
      userID: selectedUser.id,
      amount: parseFloat(amount),
      period: `${type}: ${reason}`
    });

    if (res.success) {
      setAmount("");
      setReason("");
      setAlert({ message: "Pago registrado exitosamente.", type: 'success' });
      setTimeout(() => setAlert(null), 4000);
      const updatedHistory = await getSalaryHistory(selectedUser.id, 0, PAGE_SIZE);
      setHistory(updatedHistory.items);
      setHasMore(updatedHistory.hasMore);
    } else {
      setAlert({ message: res.error || "Error al registrar pago.", type: 'error' });
      if (res.fieldErrors) setErrors(res.fieldErrors);
    }
  };

  return (
    <div className="flex items-start md:items-center justify-center w-full min-h-full md:h-full p-2 md:p-4">
      <div className="flex flex-col items-center md:h-full outline rounded-md bg-white w-full max-w-6xl p-4 md:p-6 md:overflow-hidden">

        {/* User Selection */}
        <div className="w-full mb-6 shrink-0">
          {alert && (
            <div className={`w-full p-3 rounded mb-2 text-sm font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {alert.message}
            </div>
          )}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                className="w-full md:w-75 justify-between font-normal"
              >
                <span className="truncate">
                  {selectedUser ? `${selectedUser.name} (@${selectedUser.username})` : "Seleccionar Empleado"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              {/* shouldFilter off: results already come filtered from the server */}
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por nombre o usuario..."
                  value={userQuery}
                  onValueChange={setUserQuery}
                />
                <CommandList>
                  <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id.toString()}
                        onSelect={() => {
                          setSelectedUser(user);
                          setPickerOpen(false);
                        }}
                      >
                        {user.name} (@{user.username})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.userID && <p className="text-red-500 text-xs mt-1">{errors.userID[0]}</p>}

        </div>

        <div className="w-full flex-1 min-h-0 flex flex-col md:flex-row gap-6">
          {/* Controls */}
          <div className="md:h-full min-h-0 w-full md:w-1/2 flex flex-col gap-6">
            <div className="space-y-4 shrink-0">
              <div className="flex flex-col gap-2">
                <Label>Monto</Label>
                <Input
                  type="number"
                  placeholder="$0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount[0]}</p>}

              </div>

              <div className="flex flex-col gap-2">
                <Label>Motivo / Descripción</Label>
                <Input
                  placeholder="Ej: Bono por puntualidad"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {errors.period && <p className="text-red-500 text-xs mt-1">{errors.period[0]}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <Button onClick={() => handlePayment("ADELANTO")} className="cursor-pointer" variant="outline">Adelantar Sueldo</Button>
              <Button onClick={() => handlePayment("BONO")} className="cursor-pointer bg-amber-500 hover:bg-amber-400">Otorgar Bono</Button>
              <Button onClick={() => handlePayment("SUELDO")} className="cursor-pointer" >Registrar Pago de Sueldo</Button>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block" />
          <Separator className="md:hidden" />

          {/* Info & History */}
          <div className="md:h-full min-h-0 w-full md:w-1/2 flex flex-col gap-5">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="font-bold">Nombre: <span className="font-normal">{selectedUser?.name || "---"}</span></p>
              <p className="font-bold">Fecha de ingreso: <span className="font-normal">
                {selectedUser?.registeredAt ? format(new Date(selectedUser.registeredAt), "PPP") : "---"}
              </span></p>
            </div>

            <ScrollArea className="flex-1 min-h-0 h-72 md:h-auto w-full rounded-md border p-2 md:p-4 bg-white">
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
              <InfiniteScroll onLoadMore={loadMoreHistory} hasMore={hasMore} loading={loadingMore} />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium leading-none">{children}</label>;
}