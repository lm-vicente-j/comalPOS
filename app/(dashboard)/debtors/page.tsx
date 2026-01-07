import DebtorsTable from "@/app/(dashboard)/debtors/debts-table";
import { Separator } from "@/components/ui/separator";
import { Customer } from "@/lib/defs";
import { debtsColumns } from "./debts-columns";

async function getDebtors(): Promise<Customer[]> {
    const data: Customer[] = [
        {
            id: 1,
            customerName: "Juan Pérez",
            alias: "juanp",
            lastConsumption: new Date("2025-12-25"),
            outstandingBalance: 15.13,
            registeredDate: new Date("2024-01-15")
        },
        {
            id: 2,
            customerName: "María López",
            alias: "maril",
            lastConsumption: new Date("2025-07-22"),
            outstandingBalance: 0,
            registeredDate: new Date("2023-11-03")
        },
        {
            id: 3,
            customerName: "Carlos Hernández",
            alias: "charly",
            lastConsumption: new Date("2025-08-01"),
            outstandingBalance: 120.5,
            registeredDate: new Date("2022-06-18")
        },
        {
            id: 4,
            customerName: "Ana Torres",
            alias: "anitat",
            lastConsumption: new Date("2025-06-30"),
            outstandingBalance: 45.75,
            registeredDate: new Date("2024-03-09")
        },
        {
            id: 5,
            customerName: "Luis Martínez",
            alias: "lucho",
            lastConsumption: new Date("2025-08-05"),
            outstandingBalance: 300,
            registeredDate: new Date("2021-09-27")
        },
        {
            id: 6,
            customerName: "Sofía Ramírez",
            alias: "sofi",
            lastConsumption: new Date("2025-07-18"),
            outstandingBalance: 8.9,
            registeredDate: new Date("2023-02-14")
        },
        {
            id: 7,
            customerName: "Miguel Ángel",
            alias: "mike",
            lastConsumption: new Date("2025-08-02"),
            outstandingBalance: 67.2,
            registeredDate: new Date("2022-12-01")
        },
        {
            id: 8,
            customerName: "Fernanda Cruz",
            alias: "ferc",
            lastConsumption: new Date("2025-07-29"),
            outstandingBalance: 0,
            registeredDate: new Date("2024-05-20")
        },
        {
            id: 9,
            customerName: "Roberto Díaz",
            alias: "betod",
            lastConsumption: new Date("2025-06-11"),
            outstandingBalance: 210.99,
            registeredDate: new Date("2020-08-08")
        },
        {
            id: 10,
            customerName: "Valeria Gómez",
            alias: "vale",
            lastConsumption: new Date("2025-08-07"),
            outstandingBalance: 34,
            registeredDate: new Date("2023-10-30")
        },
        {
            id: 1,
            customerName: "Juan Pérez",
            alias: "juanp",
            lastConsumption: new Date("2025-08-09"),
            outstandingBalance: 15.13,
            registeredDate: new Date("2024-01-15")
        },
        {
            id: 2,
            customerName: "María López",
            alias: "maril",
            lastConsumption: new Date("2025-07-22"),
            outstandingBalance: 0,
            registeredDate: new Date("2023-11-03")
        },
        {
            id: 3,
            customerName: "Carlos Hernández",
            alias: "charly",
            lastConsumption: new Date("2025-08-01"),
            outstandingBalance: 120.5,
            registeredDate: new Date("2022-06-18")
        },
        {
            id: 4,
            customerName: "Ana Torres",
            alias: "anitat",
            lastConsumption: new Date("2025-06-30"),
            outstandingBalance: 45.75,
            registeredDate: new Date("2024-03-09")
        },
        {
            id: 5,
            customerName: "Luis Martínez",
            alias: "lucho",
            lastConsumption: new Date("2025-08-05"),
            outstandingBalance: 300,
            registeredDate: new Date("2021-09-27")
        },
        {
            id: 6,
            customerName: "Sofía Ramírez",
            alias: "sofi",
            lastConsumption: new Date("2025-07-18"),
            outstandingBalance: 8.9,
            registeredDate: new Date("2023-02-14")
        },
        {
            id: 7,
            customerName: "Miguel Ángel",
            alias: "mike",
            lastConsumption: new Date("2025-08-02"),
            outstandingBalance: 67.2,
            registeredDate: new Date("2022-12-01")
        },
        {
            id: 8,
            customerName: "Fernanda Cruz",
            alias: "ferc",
            lastConsumption: new Date("2025-07-29"),
            outstandingBalance: 0,
            registeredDate: new Date("2024-05-20")
        },
        {
            id: 9,
            customerName: "Roberto Díaz",
            alias: "betod",
            lastConsumption: new Date("2025-06-11"),
            outstandingBalance: 210.99,
            registeredDate: new Date("2020-08-08")
        },
        {
            id: 10,
            customerName: "Valeria Gómez",
            alias: "vale",
            lastConsumption: new Date("2025-08-07"),
            outstandingBalance: 34,
            registeredDate: new Date("2023-10-30")
        }
    ]
    return data;
}

export default async function Home() {

    const data = await getDebtors();

    return (
        <div className="flex flex-col items-center justify-around z-0 w-full h-full">
            <div className="flex flex-row items-center justify-center w-[100%] h-[30%]">
                <div className="outline rounded-md w-[95%] h-[80%] flex flex-row items-center justify-around">
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p>Total por cobrar</p>
                        <p>$0.00</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p>Deudores activos</p>
                        <p>$0.00</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p>Cobros del dia</p>
                        <p>$0.00</p>
                    </div>

                </div>
            </div>

            <div className="flex flex-row items-start justify-center w-[100%] h-[70%]">
                <DebtorsTable columns={debtsColumns} data={data} />
            </div>
        </div>

    );
}