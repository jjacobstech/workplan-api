import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
const supabaseUrl = "https://qtoesioikdhpsgxxrcot.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, `${supabaseKey}`);

const  fetchSchema = z.object({
      query:z.string().min(1).trim()
});

export const POST = async (req: NextRequest) => {

const body = await req.json()
const  input = fetchSchema.safeParse(body);

const  query = input.data?.query;

const data = await supabase.from("civil_servants").select("*").like("id_card_service_number", `%${query}%`);

return NextResponse.json({
      data: data
},{
      status: 200,
})
};
