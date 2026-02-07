
import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { username, password, semesterId } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // CLOUD MODE: If an external VTOP API is configured (e.g. on Render)
        const vtopApiUrl = process.env.VTOP_API_URL;
        if (vtopApiUrl) {
            console.log('Using Cloud VTOP API:', vtopApiUrl);
            const response = await fetch(`${vtopApiUrl}/api/vtop-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, semesterId }),
            });
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        }

        // LOCAL MODE: Use the Windows .exe (for development)
        const rustBinaryPath = path.resolve(
            process.cwd(),
            'rust_vtop/rust/target/debug/debug_timetable.exe'
        );

        const args = [username, password];
        if (semesterId) args.push(semesterId);

        return new Promise((resolve) => {
            execFile(rustBinaryPath, args, (error, stdout, stderr) => {
                if (error) {
                    console.error('Rust execution error:', error);
                    return resolve(NextResponse.json({
                        error: 'Failed to execute VTOP fetcher',
                        details: stderr || error.message
                    }, { status: 500 }));
                }

                try {
                    const jsonStartIndex = stdout.indexOf('{');
                    const jsonEndIndex = stdout.lastIndexOf('}');

                    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                        throw new Error("No JSON found in output");
                    }

                    const jsonString = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
                    const responseData = JSON.parse(jsonString);

                    if (responseData.error) {
                        return resolve(NextResponse.json({
                            error: responseData.error,
                            details: responseData.details
                        }, { status: 401 }));
                    }

                    const timetable = responseData.timetable || {};
                    const semesters = responseData.semesters?.semesters || [];

                    // Extract faculty from timetable slots
                    const slots = timetable.slots || [];
                    const facultyMap = new Map();

                    slots.forEach((slot: any) => {
                        if (slot.faculty && slot.faculty.trim() !== "") {
                            const cabinId = slot.room_no || `UNKNOWN-${slot.faculty.replace(/\s+/g, '-')}`;
                            if (!facultyMap.has(cabinId)) {
                                facultyMap.set(cabinId, {
                                    cabinId,
                                    name: slot.faculty,
                                });
                            }
                        }
                    });

                    const facultyList = Array.from(facultyMap.values());

                    return resolve(NextResponse.json({
                        success: true,
                        faculty: facultyList,
                        semesters: semesters
                    }));
                } catch (parseError) {
                    console.error('JSON Parse Error:', parseError);
                    return resolve(NextResponse.json({
                        error: 'Failed to parse VTOP data',
                        details: stdout
                    }, { status: 500 }));
                }
            });
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
