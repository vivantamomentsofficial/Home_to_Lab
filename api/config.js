// Vercel Serverless Function to securely expose Supabase Credentials from Environment Variables
export default function handler(request, response) {
    // Set headers to allow client-side AJAX requests
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET');
    response.setHeader('Content-Type', 'application/json');

    response.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    });
}
