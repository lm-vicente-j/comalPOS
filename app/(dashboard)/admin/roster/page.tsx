"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef } from "react";
import { useEffect } from "react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getSalaryHistory, saveSalaryPayment } from "@/lib/actions/payrolls";
import { GetAllUsers } from "@/lib/actions/users";


const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]

export function TableDemo() {
  return (
    <Table>
      <TableCaption>Historial de pagos.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Fecha</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">INV099</TableCell>
          <TableCell>PAgado</TableCell>
          <TableCell>---</TableCell>
          <TableCell className="text-right">50</TableCell>
        </TableRow>
      </TableBody>

    </Table>
  )
}

import { ButtonGroup } from "@/components/ui/button-group";

import { toDebt } from "@/lib/actions/debts";

import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandEmpty
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,

} from "@/components/ui/dialog"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { closeAccountAction } from "@/lib/actions/sales";
import { Customer } from "@/lib/actions/customers";
import { Sale } from "@/lib/actions/sales";

interface SalesInputProps {
    currentCustomerSales: Sale[];
    setSalesFilter: (val: string) => void;
    query: string;
    setQuery: (val: string) => void;
    clientSelected: boolean;
    setClientSelected: (val: boolean) => void;
    onClientSelect: (name: string) => void;
    tableNumber: number;
    setTableNumber: (val: number) => void;
    setDialogOpen: (val: boolean) => void;
    dialogOpen: boolean;
    customerList: Customer[]
    setCurrentCustomerID: (val: number) => void;
    currentCustomerID: number;
}



function InputUserSearch({ currentCustomerSales, setSalesFilter,query, setQuery, clientSelected, setClientSelected, onClientSelect, tableNumber, setTableNumber, dialogOpen, setDialogOpen, customerList,setCurrentCustomerID,currentCustomerID}: SalesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const [open, setOpen] = useState(false);

  const isAlreadyFreeSale = tableNumber === 0 && !clientSelected && query === "";
  const hasCustomers = Array.isArray(customerList) && customerList.length > 0;
  const isInputDisabled = !hasCustomers;

  const handleCloseAccount = async () => {
    const sourceType = tableNumber !== 0 ? `MESA-${tableNumber}` : `CL- ${query}`;

    const result = await closeAccountAction(sourceType);

    if (result.success) {
      setClientSelected(false);
      setQuery("");
      setTableNumber(0);
      setDialogOpen(false);
    }
  };

  const handleToDebt = async (idCustomer: number, sales: Sale[]) => {
    await toDebt(idCustomer, sales);
  }
  return (

    <div className=" h-20 flex flex-col items-start justify-between my-5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input ref={inputRef} type="text"
            placeholder={isInputDisabled ? "No hay clientes registrados" : "Nombre de cliente"}
            disabled={isInputDisabled} value={query} onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }} className="max-w" />
        </PopoverAnchor>
        <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" onOpenAutoFocus={(e) => e.preventDefault()} >
          <Command>
            <CommandList>
              <CommandEmpty>No se encontraron clientes.</CommandEmpty>
              <CommandGroup>

                {Array.isArray(customerList) && customerList.length > 0 ? (
                  customerList.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item?.customerName || ""}
                      onSelect={() => {
                        onClientSelect(item?.customerName || "NONAME");
                        setClientSelected(true);
                        setTableNumber(0);
                        setOpen(false);
                        setCurrentCustomerID(item.id);
                        setSalesFilter("CL- " + item?.customerName)
                      }}
                      className="cursor-pointer"
                    >
                      {item?.alias} | {item?.customerName}
                    </CommandItem>
                  ))
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <ButtonGroup>
        <Button className="cursor-pointer" disabled={isAlreadyFreeSale} onClick={() => {
          setClientSelected(false);
          setQuery("");
          setTableNumber(0);
          setSalesFilter("VENTA_LIBRE");

        }} >Cambiar a venta libre</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>

            <Button variant="destructive" className="cursor-pointer" disabled={!clientSelected}>Cerrar cuenta {query}</Button>

          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pago de cuenta {query === "" ? "Mesa #" + tableNumber : query}</DialogTitle>
              <DialogDescription>
                Asegurate de haber procesado el pago antes de continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <DialogClose asChild>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    handleCloseAccount()
                  }}
                >
                  Confirmar y Cerrar
                </Button>
              </DialogClose>

            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="cursor-pointer bg-amber-500 text-black hover:bg-amber-400" disabled={!clientSelected}>A deuda {query}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desea enviar la cuenta de "{query}" a deuda?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button className="cursor-pointer" variant={"outline"}>Cancelar</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={() => handleToDebt(currentCustomerID, currentCustomerSales)} className="cursor-pointer">Aceptar</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ButtonGroup>

    </div>
  );
}

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [userName, setUserName] = useState("Nombre--");
  const [registeredAt, setRegisteredAt] = useState("19 Julio 2026");

  useEffect(() => {
    GetAllUsers().then(setUsers);
  }, []);

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    const userHistory = await getSalaryHistory(user.id);
    setHistory(userHistory);
  };

  const handlePayment = async (type: "ADELANTO" | "BONO" | "SUELDO") => {
    if (!selectedUser || !amount) return alert("Seleccione usuario y monto");

    const res = await saveSalaryPayment({
      userID: selectedUser.id,
      amount: parseFloat(amount),
      period: `${type}: ${reason || "Pago de periodo"}`
    });

    if (res.success) {
      setAmount("");
      setReason("");
      handleSelectUser(selectedUser);
    }
  };

  return (
    <div className="flex items-center justify-center z-0 w-full h-full ">
      <div className="flex flex-col items-center justify-around h-[80%] outline rounded-md bg-white w-[95%]">

        <InputUserSearch />
        <div className="w-full h-full flex flex-row items-center justify-center">
          <div className="h-full w-[50%] flex flex-col items-start justify-start gap-5">
            <div className="w-full flex flex-row gap-5 justify-between px-5">
              <Input type="text" className="w-50" placeholder="$0.00" />
              <Button type="button" className="cursor-pointer">Adelantar Sueldo</Button>
            </div>
            <div className="w-full flex flex-row gap-5 justify-between px-5">
              <Input type="text" className="w-50" placeholder="Porcentaje de aumento" />
              <Button type="button" className="cursor-pointer">Establecer Aumento</Button>
            </div>
            <div className="w-full flex flex-row gap-5 justify-between px-5">
              <Input type="text" className="w-50" placeholder="$0.00" />
              <Input type="text" placeholder="Motivo del bono..." />
              <Button type="button" className="cursor-pointer">Otorgar bono</Button>
            </div>
          </div>
          <Separator orientation="vertical" />
          <div className="h-full w-[50%] flex flex-col items-start p-4 gap-5">
            <p>Nombre: {userName}</p>
            <p>Fecha de ingreso: {registeredAt}</p>
            <p>Antiguedad: 10 años</p>
            <ScrollArea className=" h-[50%] w-full rounded-md border p-4 bg-white">
              <TableDemo />
            </ScrollArea>
          </div>
        </div>


      </div>
    </div>

  );
}