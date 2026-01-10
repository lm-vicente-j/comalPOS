"use server";
import prisma from "../prisma";

export async function GetAllStaffUsers(){
    try{
        const userList = prisma.user.findMany(
      {
        select: {id: true, name: true},
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