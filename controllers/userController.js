const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const secretKey = 'your_secret_key';
const crypto = require('crypto');
// Assuming these are defined in your userController.js or imported
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync("adnan-tech-programming-computers", 'salt', 32); // Make sure this matches the encryption setup

// PostgreSQL configuration
const pool = new Pool({
    user: 'prajwal.pawar',
    host: '192.168.1.39',
    database: 'LeadDB',
    password: 'PPIndia@098',
    port: '5432',
});

async function login(req, res) {
    const { username, password } = req.body;
    // Check credentials using PostgreSQL (replace with your authentication logic)
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const userId = result.rows[0].userid; // Assuming userid is the user identifier
            const token = jwt.sign({ userid: userId }, secretKey, { expiresIn: '1h' });
            res.cookie('jwt', token, { httpOnly: true, secure: true });
            const currentTime = new Date().toISOString();
            // const userHistoryResult = await pool.query('SELECT * FROM userhistory WHERE userid = $1', [userId]);
            // if (userHistoryResult.rows.length === 0) {
            //     // First time user, insert first_login
            //     await pool.query('INSERT INTO userhistory (userid, firstlogin) VALUES ($1, $2)', [userId, currentTime]);
            // } else {
            //     // Existing user, update last_login
            //     await pool.query('UPDATE userhistory SET lastlogin = $1 WHERE userid = $2', [currentTime, userId]);
            // }
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function logout(req, res) {
    try {
        // Retrieve user id from JWT token
        // const token = req.cookies.jwt;
        // const decoded = jwt.verify(token, secretKey);
        // const userId = decoded.userid; // Assuming userid is the user identifier
        // const currentTime = new Date().toISOString();
        // Update last_logout time in user history
        // await pool.query('UPDATE userhistory SET lastlogout = $1 WHERE userid = $2', [currentTime, userId]);
        // res.clearCookie('jwt');
        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function search(req, res) {
    try {
        res.json({ success: true, message: 'Welcome to the search!' });
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ success: false, message: 'Internal server error in search' });
    }
}

let currentAbortController = null; // Keep track of the current AbortController

async function fetchLeads(req, res) {
  // Abort any previous queries
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Create a new AbortController for the current request
  const abortController = new AbortController();
  currentAbortController = abortController;

  // Extract all filters from request body
  const {
    selectedIndustries, selectedTitles, selectedTitles1, selectedTitles3, selectedTitles4,
    selectedLevels, selectedFunctions, selectedSizes, companyName,
    selectedCountry, selectedState, selectedCity, selectedIncludedCompanies,
    selectedExcludedCompanies, selectedIncludedCompanies3, selectedIncludedCompanies4
  } = req.body;

  // Base query setup
  let query = `SELECT firstname || ' ' || lastname AS contactname, jobtitle, companyname, industrytype, uuid 
               FROM public.prospects WHERE 1=1`;
  const queryParams = [];

  // Filter by included companies
  if (selectedIncludedCompanies && selectedIncludedCompanies.length > 0) {
    queryParams.push(...selectedIncludedCompanies);
    query += ` AND (${selectedIncludedCompanies.map((_, i) => `companyname = $${i + 1}`).join(" OR ")})`;
  }

  // Exclude specific companies
  if (selectedExcludedCompanies && selectedExcludedCompanies.length > 0) {
    queryParams.push(...selectedExcludedCompanies);
    query += ` AND (${selectedExcludedCompanies.map((_, i) => `companyname != $${queryParams.length - selectedExcludedCompanies.length + i + 1}`).join(" AND ")})`;
  }

  // Filter by included domains
  if (selectedIncludedCompanies3 && selectedIncludedCompanies3.length > 0) {
    queryParams.push(...selectedIncludedCompanies3);
    query += ` AND (${selectedIncludedCompanies3.map((_, i) => `domain = $${queryParams.length - selectedIncludedCompanies3.length + i + 1}`).join(" OR ")})`;
  }

  // Exclude specific domains
  if (selectedIncludedCompanies4 && selectedIncludedCompanies4.length > 0) {
    queryParams.push(...selectedIncludedCompanies4);
    query += ` AND (${selectedIncludedCompanies4.map((_, i) => `domain != $${queryParams.length - selectedIncludedCompanies4.length + i + 1}`).join(" AND ")})`;
  }

  // Filter by industries
  if (selectedIndustries && selectedIndustries.length > 0) {
    queryParams.push(...selectedIndustries);
    query += ` AND industrytype IN (${selectedIndustries.map((_, i) => `$${queryParams.length - selectedIndustries.length + i + 1}`).join(", ")})`;
  }

  // Filter by functions
  if (selectedFunctions && selectedFunctions.length > 0) {
    queryParams.push(...selectedFunctions);
    query += ` AND jobfunction IN (${selectedFunctions.map((_, i) => `$${queryParams.length - selectedFunctions.length + i + 1}`).join(", ")})`;
  }

  // Filter by job titles
  if (selectedTitles && selectedTitles.length > 0) {
    queryParams.push(...selectedTitles);
    query += ` AND jobtitle IN (${selectedTitles.map((_, i) => `$${queryParams.length - selectedTitles.length + i + 1}`).join(", ")})`;
  }

  // Exclude specific job titles
  if (selectedTitles1 && selectedTitles1.length > 0) {
    queryParams.push(...selectedTitles1);
    query += ` AND jobtitle NOT IN (${selectedTitles1.map((_, i) => `$${queryParams.length - selectedTitles1.length + i + 1}`).join(", ")})`;
  }

  // Filter by job titles with fuzzy match
  if (selectedTitles3 && selectedTitles3.length > 0) {
    queryParams.push(...selectedTitles3.map(title => `%${title}%`));
    query += ` AND (${selectedTitles3.map((_, i) => `jobtitle ILIKE $${queryParams.length - selectedTitles3.length + i + 1}`).join(" OR ")})`;
  }

  // Exclude job titles with fuzzy match
  if (selectedTitles4 && selectedTitles4.length > 0) {
    queryParams.push(...selectedTitles4.map(title => `%${title}%`));
    query += ` AND (${selectedTitles4.map((_, i) => `jobtitle NOT ILIKE $${queryParams.length - selectedTitles4.length + i + 1}`).join(" AND ")})`;
  }

  // Filter by job levels
  if (selectedLevels && selectedLevels.length > 0) {
    queryParams.push(...selectedLevels);
    query += ` AND joblevel IN (${selectedLevels.map((_, i) => `$${queryParams.length - selectedLevels.length + i + 1}`).join(", ")})`;
  }

  // Filter by employee size
  if (selectedSizes && selectedSizes.length > 0) {
    queryParams.push(...selectedSizes);
    query += ` AND employeesize IN (${selectedSizes.map((_, i) => `$${queryParams.length - selectedSizes.length + i + 1}`).join(", ")})`;
  }

  // Filter by company name
  if (companyName) {
    queryParams.push(`%${companyName.trim()}%`);
    query += ` AND companyname ILIKE $${queryParams.length}`; // ILIKE for case-insensitive matching
  }

  // Filter by country
  if (selectedCountry && selectedCountry.length > 0) {
    queryParams.push(...selectedCountry);
    query += ` AND country IN (${selectedCountry.map((_, i) => `$${queryParams.length - selectedCountry.length + i + 1}`).join(", ")})`;
  }

  // Filter by state
  if (selectedState) {
    queryParams.push(selectedState);
    query += ` AND state = $${queryParams.length}`;
  }

  // Filter by city
  if (selectedCity) {
    queryParams.push(selectedCity);
    query += ` AND city = $${queryParams.length}`;
  }

  // Log the query before execution
  console.log("Executing SQL query:", query);
  console.log("With parameters:", queryParams);

  try {
    const { rows } = await pool.query(query, queryParams, {
      signal: abortController.signal // Pass the AbortSignal to the query
    });

    res.json({
      success: true,
      data: rows.map(row => ({
        contactName: row.contactname,
        jobTitle: row.jobtitle,
        companyName: row.companyname,
        industry: row.industrytype,
        uuid: row.uuid
      }))
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Query aborted:', error.message);
      res.status(499).json({ success: false, message: 'Query aborted' });
    } else {
      console.error('Error fetching leads:', error);
      res.status(500).json({ success: false, message: 'Internal server error in fetching leads' });
    }
  } finally {
    currentAbortController = null; // Reset the AbortController after completion
  }
}

async function fetchLeads2(req, res) {
  // Extract all filters from request body, including new location filters
  const { selectedIndustries, selectedSubIndustries, selectedTitles, selectedTitles1, selectedTitles3, selectedTitles4, selectedLevels, selectedFunctions, selectedSizes, company_name, selectedCountry, selectedRegion, selectedState, selectedCity, selectedIncludedCompanies, selectedExcludedCompanies, selectedIncludedCompanies3, selectedIncludedCompanies4 } = req.body;

  // Base query setup
  let query = `
  SELECT first_name || ' ' || last_name AS contactname, job_title, company_name, industry_type, sr_no
  FROM public.inhouse_final
  WHERE 1=1`;

  const queryParams = [];

// Filter by included companies
if (selectedIncludedCompanies && selectedIncludedCompanies.length > 0) {
queryParams.push(...selectedIncludedCompanies);
query += ` AND (${selectedIncludedCompanies.map((_, i) => `company_name = $${i + 1}`).join(" OR ")})`;
}

// Exclude specific companies
if (selectedExcludedCompanies && selectedExcludedCompanies.length > 0) {
queryParams.push(...selectedExcludedCompanies);
query += ` AND (${selectedExcludedCompanies.map((_, i) => `company_name != $${queryParams.length - selectedExcludedCompanies.length + i + 1}`).join(" AND ")})`;
}

// Filter by included companies
if (selectedIncludedCompanies3 && selectedIncludedCompanies3.length > 0) {
queryParams.push(...selectedIncludedCompanies3);
query += ` AND (${selectedIncludedCompanies3.map((_, i) => `domain = $${i + 1}`).join(" OR ")})`;
}

// Exclude specific companies
if (selectedIncludedCompanies4 && selectedIncludedCompanies4.length > 0) {
queryParams.push(...selectedIncludedCompanies4);
query += ` AND (${selectedIncludedCompanies4.map((_, i) => `domain != $${queryParams.length - selectedIncludedCompanies4.length + i + 1}`).join(" AND ")})`;
}

// Filter by industries
if (selectedIndustries && selectedIndustries.length > 0) {
  queryParams.push(...selectedIndustries);
  query += ` AND industry_type IN (${selectedIndustries.map((_, i) => `$${queryParams.length - selectedIndustries.length + i + 1}`).join(", ")})`;
}

// Filter by industries
if (selectedSubIndustries && selectedSubIndustries.length > 0) {
queryParams.push(...selectedSubIndustries);
query += ` AND sub_industry IN (${selectedSubIndustries.map((_, i) => `$${queryParams.length - selectedSubIndustries.length + i + 1}`).join(", ")})`;
}


// Filter by industries
if (selectedFunctions && selectedFunctions.length > 0) {
  queryParams.push(...selectedFunctions);
  query += ` AND job_function IN (${selectedFunctions.map((_, i) => `$${queryParams.length - selectedFunctions.length + i + 1}`).join(", ")})`;
}

// Filter by job titles
if (selectedTitles && selectedTitles.length > 0) {
  queryParams.push(...selectedTitles);
  query += ` AND job_title IN (${selectedTitles.map((_, i) => `$${queryParams.length - selectedTitles.length + i + 1}`).join(", ")})`;
}

// Filter by job titles
if (selectedTitles1 && selectedTitles1.length > 0) {
  queryParams.push(...selectedTitles1);
  query += ` AND job_title NOT IN (${selectedTitles1.map((_, i) => `$${queryParams.length - selectedTitles1.length + i + 1}`).join(", ")})`;
}

  // Filter by job titles
  if (selectedTitles3 && selectedTitles3.length > 0) {
    queryParams.push(...selectedTitles3.map(title => `%${title}%`));
query += ` AND (${selectedTitles3.map((_, i) => `job_title ILIKE $${queryParams.length - selectedTitles3.length + i + 1}`).join(" OR ")})`;
  }

  if (selectedTitles4 && selectedTitles4.length > 0) {
    // Add fuzzy match patterns to queryParams
    queryParams.push(...selectedTitles4.map(title => `%${title}%`));
    // console.log("Excluding fuzzy match inside query")
    // Build the query with NOT ILIKE for each pattern
    query += ` AND (${selectedTitles4.map((_, i) => `job_title NOT ILIKE $${queryParams.length - selectedTitles4.length + i + 1}`).join(" AND ")})`;
  }

// Filter by job levels
if (selectedLevels && selectedLevels.length > 0) {
  queryParams.push(...selectedLevels);
  query += ` AND job_level IN (${selectedLevels.map((_, i) => `$${queryParams.length - selectedLevels.length + i + 1}`).join(", ")})`;
}

// Filter by Employee Size
if (selectedSizes && selectedSizes.length > 0) {
  queryParams.push(...selectedSizes);
  query += ` AND employee_size IN (${selectedSizes.map((_, i) => `$${queryParams.length - selectedSizes.length + i + 1}`).join(", ")})`;
}

// Filter by company name
if (company_name) {
  queryParams.push(`%${company_name.trim()}%`);
  query += ` AND company_name ILIKE $${queryParams.length}`; // ILIKE for case-insensitive matching
}


if (selectedCountry && selectedCountry.length > 0) {
  // Add the selectedCountry array to queryParams
  queryParams.push(...selectedCountry);

  // Construct the SQL query with dynamic placeholders
  query += ` AND country IN (${selectedCountry.map((_, i) => `$${queryParams.length - selectedCountry.length + i + 1}`).join(", ")})`;
}

if (selectedRegion && selectedRegion.length > 0) {
// Add the selectedCountry array to queryParams
queryParams.push(...selectedRegion);

// Construct the SQL query with dynamic placeholders
query += ` AND region IN (${selectedRegion.map((_, i) => `$${queryParams.length - selectedRegion.length + i + 1}`).join(", ")})`;
}

if (selectedState) {
  queryParams.push(selectedState);
  query += ` AND state = $${queryParams.length}`;
}

if (selectedCity) {
  queryParams.push(selectedCity);
  query += ` AND city = $${queryParams.length}`;
}

// Apply LIMIT clause to fetch only the first 1000 rows
query += ' LIMIT 1000';

  // Before executing the query
// console.log("Executing SQL query:", query);
// console.log("With parameters:", queryParams);

try {
  const { rows } = await pool.query(query, queryParams);
  res.json({ success: true, data: rows.map(row => ({
    contactName: row.contactname,
    jobTitle: row.job_title,
    companyName: row.company_name,
    industry: row.industry_type,
    sr_no: row.sr_no
  })) });
} catch (error) {
console.error('Error fetching leads:', error);
res.status(500).json({ success: false, message: 'Internal server error in fetching leads' });
}

}

async function fetchLeads1(req, res) {
  // console.log("Inside FetchLead 1");
  // Extract all filters from request body, including new location filters
  const { selectedIndustries, selectedSubIndustries, selectedTitles, selectedTitles1, selectedTitles3, selectedTitles4, selectedLevels, selectedFunctions, selectedSizes, company_name, selectedCountry, selectedRegion, selectedState, selectedCity, selectedIncludedCompanies, selectedExcludedCompanies, selectedIncludedCompanies3, selectedIncludedCompanies4 } = req.body;

  // Base query setup
  let query = `SELECT * FROM public.inhouse_final WHERE 1=1`;
  const queryParams = [];

// Filter by included companies
if (selectedIncludedCompanies && selectedIncludedCompanies.length > 0) {
queryParams.push(...selectedIncludedCompanies);
query += ` AND (${selectedIncludedCompanies.map((_, i) => `company_name = $${i + 1}`).join(" OR ")})`;
}

// Exclude specific companies
if (selectedExcludedCompanies && selectedExcludedCompanies.length > 0) {
queryParams.push(...selectedExcludedCompanies);
query += ` AND (${selectedExcludedCompanies.map((_, i) => `company_name != $${queryParams.length - selectedExcludedCompanies.length + i + 1}`).join(" AND ")})`;
}

// Filter by included companies
if (selectedIncludedCompanies3 && selectedIncludedCompanies3.length > 0) {
queryParams.push(...selectedIncludedCompanies3);
query += ` AND (${selectedIncludedCompanies3.map((_, i) => `domain = $${i + 1}`).join(" OR ")})`;
}

// Exclude specific companies
if (selectedIncludedCompanies4 && selectedIncludedCompanies4.length > 0) {
queryParams.push(...selectedIncludedCompanies4);
query += ` AND (${selectedIncludedCompanies4.map((_, i) => `domain != $${queryParams.length - selectedIncludedCompanies4.length + i + 1}`).join(" AND ")})`;
}

// Filter by industries
if (selectedIndustries && selectedIndustries.length > 0) {
  queryParams.push(...selectedIndustries);
  query += ` AND industry_type IN (${selectedIndustries.map((_, i) => `$${queryParams.length - selectedIndustries.length + i + 1}`).join(", ")})`;
}

// Filter by industries
if (selectedSubIndustries && selectedSubIndustries.length > 0) {
  queryParams.push(...selectedSubIndustries);
  query += ` AND sub_industry IN (${selectedSubIndustries.map((_, i) => `$${queryParams.length - selectedSubIndustries.length + i + 1}`).join(", ")})`;
}

// Filter by industries
if (selectedFunctions && selectedFunctions.length > 0) {
  queryParams.push(...selectedFunctions);
  query += ` AND job_function IN (${selectedFunctions.map((_, i) => `$${queryParams.length - selectedFunctions.length + i + 1}`).join(", ")})`;
}

// Filter by job titles
if (selectedTitles && selectedTitles.length > 0) {
  queryParams.push(...selectedTitles);
  query += ` AND job_title IN (${selectedTitles.map((_, i) => `$${queryParams.length - selectedTitles.length + i + 1}`).join(", ")})`;
}

// Filter by job titles
if (selectedTitles1 && selectedTitles1.length > 0) {
  queryParams.push(...selectedTitles1);
  query += ` AND job_title NOT IN (${selectedTitles1.map((_, i) => `$${queryParams.length - selectedTitles1.length + i + 1}`).join(", ")})`;
}

  // Filter by job titles
  if (selectedTitles3 && selectedTitles3.length > 0) {
    queryParams.push(...selectedTitles3.map(title => `%${title}%`));
query += ` AND (${selectedTitles3.map((_, i) => `job_title ILIKE $${queryParams.length - selectedTitles3.length + i + 1}`).join(" OR ")})`;
  }

  if (selectedTitles4 && selectedTitles4.length > 0) {
    // Add fuzzy match patterns to queryParams
    queryParams.push(...selectedTitles4.map(title => `%${title}%`));
    // console.log("Excluding fuzzy match inside query")
    // Build the query with NOT ILIKE for each pattern
    query += ` AND (${selectedTitles4.map((_, i) => `job_title NOT ILIKE $${queryParams.length - selectedTitles4.length + i + 1}`).join(" AND ")})`;
  }

// Filter by job levels
if (selectedLevels && selectedLevels.length > 0) {
  queryParams.push(...selectedLevels);
  query += ` AND job_level IN (${selectedLevels.map((_, i) => `$${queryParams.length - selectedLevels.length + i + 1}`).join(", ")})`;
}

// Filter by Employee Size
if (selectedSizes && selectedSizes.length > 0) {
  queryParams.push(...selectedSizes);
  query += ` AND employee_size IN (${selectedSizes.map((_, i) => `$${queryParams.length - selectedSizes.length + i + 1}`).join(", ")})`;
}

// Filter by company name
if (company_name) {
  queryParams.push(`%${company_name.trim()}%`);
  query += ` AND company_name ILIKE $${queryParams.length}`; // ILIKE for case-insensitive matching
}


if (selectedCountry && selectedCountry.length > 0) {
  // Add the selectedCountry array to queryParams
  queryParams.push(...selectedCountry);

  // Construct the SQL query with dynamic placeholders
  query += ` AND country IN (${selectedCountry.map((_, i) => `$${queryParams.length - selectedCountry.length + i + 1}`).join(", ")})`;
}

if (selectedRegion && selectedRegion.length > 0) {
  // Add the selectedCountry array to queryParams
  queryParams.push(...selectedRegion);

  // Construct the SQL query with dynamic placeholders
  query += ` AND region IN (${selectedRegion.map((_, i) => `$${queryParams.length - selectedRegion.length + i + 1}`).join(", ")})`;
}

if (selectedState) {
  queryParams.push(selectedState);
  query += ` AND state = $${queryParams.length}`;
}

if (selectedCity) {
  queryParams.push(selectedCity);
  query += ` AND city = $${queryParams.length}`;
}


  // Before executing the query
// console.log("Executing SQL query:", query);
// console.log("With parameters:", queryParams);

try {
const { rows } = await pool.query(query, queryParams);
res.json({ success: true, data: rows});
} catch (error) {
console.error('Error fetching leads:', error);
res.status(500).json({ success: false, message: 'Internal server error in fetching leads' });
}

}

function decryptString(encryptedText) {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

async function fetchProspectDetails(req, res) {
  const { sr_no } = req.params;
// console.log("Inside FetchProspect")
  try {
      const { rows } = await pool.query(`SELECT * FROM public.inhouse_final WHERE sr_no = $1`, [sr_no]);
      if (rows.length > 0) {
          const prospect = rows[0]; 
          // // Decrypt email and phone number here
          // prospect.emailid = decryptString(prospect.emailid.toString('utf-8'));
          // prospect.phonenumber = decryptString(prospect.phonenumber.toString('utf-8'));

          // Remove sensitive fields or fields you do not wish to return
          delete prospect.someSensitiveField;

          res.json({ success: true, data: prospect });
      } else {
          res.status(404).json({ success: false, message: 'Prospect not found' });
      }
  } catch (error) {
      console.error('Error fetching prospect details:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function fetchUserPlanDetails(req, res) {
    const { userId } = req.params;

    try {
        // Fetch user's plan details from your database
        const userPlanDetails = await pool.query(`SELECT * FROM public.userplandetails WHERE userid = $1`, [userId]);
        if (userPlanDetails.rows.length > 0) {
            res.json({ success: true, data: userPlanDetails.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'User plan details not found' });
        }
    } catch (error) {
        console.error('Error fetching user plan details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
  
module.exports = { login, logout, search, fetchLeads, fetchLeads1, fetchLeads2, fetchProspectDetails ,fetchUserPlanDetails   };
