"use server";

export async function createUser(prevState: any, formData: FormData) {
    const name = formData.get("name");
    const email = formData.get("email");

    console.log("Save to database, user: " + name);

    return {
        messsage: "USer created from server action",
    };

}
