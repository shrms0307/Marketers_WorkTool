// 입력받은 키워드가 db에 존재하는지 확인

import { NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyword } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json({ error: "Invalid keyword" }, { status: 400 });
    }

    const result = await withConnection(async (connection) => {
      const [rows] = await connection.query(
        `
        SELECT participation, category, img
        FROM test_infl_keyword
        WHERE keyword = ?
        `,
        [keyword]
      );
      return rows.length > 0 ? rows[0] : null; // 첫 번째 결과 반환
    });

    if (result) {
      return NextResponse.json({ exists: true, data: result });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error("Database query error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
