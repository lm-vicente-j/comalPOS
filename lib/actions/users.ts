"use server";
import prisma from "../prisma";

export async function   GetAllStaffUsers(){
    try{
        const userList = await prisma.users.findMany(
      {
        select: {id: true, name: true, active: true, role:true},
        orderBy: {name:'asc'},
        where: {
          role:{ not: "ADMIN" }
        }
      }
    );

    return userList;

    }catch(e){
        console.error(e);
        return [];
    }

}