// Trigger the file input when the button is clicked
document.getElementById('choose-product').addEventListener('click', function() {
    document.getElementById('csv-file').click();
});

// Global Variables
let salesChart; // Declare a global variable to hold the chart instance
let isMonthly = false; // Flag to track if the chart is currently in monthly view
let jsonData; // Declare a variable to hold parsed JSON data from the CSV

// Handle file selection and read the CSV file
document.getElementById('csv-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const csv = e.target.result;
        console.log(csv); // Log CSV data for debugging
        jsonData = csvToJson(csv);
        console.log(jsonData); // Log the parsed JSON data for debugging

        // If there's valid data, process and generate the yearly chart
        if (jsonData.length > 0) {
            const fromDate = new Date(document.getElementById('date-from').value);
            const endDate = new Date(document.getElementById('date-to').value);
            const tPeriod = 'yearly'; // Set to yearly for the initial chart display
            const quantitiesByPeriod = processData(jsonData, fromDate, endDate, tPeriod);
            generateChart(quantitiesByPeriod);
        } else {
            alert("No valid sales data available for the selected date range.");
        }
    };

    reader.readAsText(file);
});

// Function to convert CSV to JSON
function csvToJson(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, '')); // Get headers and remove quotes

    return lines.slice(1).map(line => {
        const data = line.split(',').map(item => item.trim().replace(/"/g, '')); // Trim and remove quotes
        if (data.length === headers.length) {
            return headers.reduce((acc, header, index) => {
                acc[header] = data[index] !== undefined && data[index] !== "" ? data[index].trim() : null; // Use null if undefined or empty
                return acc;
            }, {});
        }
        console.warn('Skipping line due to mismatched header length:', line); // Log any mismatched lines
        return null; // Return null if the line doesn't match the header length
    }).filter(Boolean); // Filter out any null entries
}

// Function to generate the chart
function generateChart(quantitiesByDates) {
    const xAxis = document.getElementById('x-axis');
    document.getElementById('y-axis').innerText = 'Sales';
    const tPeriod = document.getElementById('time-period').value;
    const header = document.getElementById('header');

    let dates;

    // Sort the dates in ascending order
    if (tPeriod === 'yearly') {
        dates = Object.keys(quantitiesByDates).sort((a, b) => {
            const [monthA, yearA] = a.split('-').map(Number);
            const [monthB, yearB] = b.split('-').map(Number);
            return yearA === yearB ? monthA - monthB : yearA - yearB;
        });
        xAxis.innerText = 'Months'; // Update x-axis label
        header.innerText = 'Bottle Opener Yearly Sales Chart'; // Update header
    } else {
        dates = Object.keys(quantitiesByDates).sort((a, b) => {
            const [dayA, monthA] = a.split('-').map(Number);
            const [dayB, monthB] = b.split('-').map(Number);
            // Sort by month first, then by day
            if (monthA === monthB) {
                return dayA - dayB; // Sort by day if months are the same
            }
            return monthA - monthB; // Sort by month otherwise
        });
        xAxis.innerText = 'Days'; // Update x-axis label
        header.innerText = 'Bottle Opener Monthly Sales Chart'; // Update header
    }

    const quantities = dates.map(date => quantitiesByDates[date]);

    // Get the canvas context
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Check if a previous chart exists and destroy it
    if (salesChart) {
        salesChart.destroy();
    }

    // Create a new bar chart
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates, // X-axis
            datasets: [{
                label: 'Sales Quantity',
                data: quantities, // Y-axis
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            onClick: (event) => {
                const activePoints = salesChart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
                if (activePoints.length > 0 && !isMonthly) {
                    const clickedIndex = activePoints[0].index;
                    const clickedLabel = salesChart.data.labels[clickedIndex]; // Get the month clicked

                    // Extract month and year from the clicked label
                    const [month, year] = clickedLabel.split('-').map(Number);
                    
                    // Set the dropdown value to "monthly"
                    document.getElementById('time-period').value = 'monthly';

                    // Filter data for the clicked month and year
                    filterDataForMonth(year, month); // Call filterData directly

                    // Set the flag to true since we are now in monthly view
                    isMonthly = true;
                }
            }
        }
    });
}

// Function to process and group data based on the time period
function processData(data, fromDate, endDate, tPeriod) {
    const quantitiesByPeriod = {};

    data.forEach(order => {
        const orderDate = new Date(order.Date);

        // Check if the order date is within the specified range
        if (orderDate >= fromDate && orderDate <= endDate) {
            let periodKey;
            if (tPeriod === 'yearly') {
                periodKey = `${String(orderDate.getMonth() + 1).padStart(2, '0')}-${orderDate.getFullYear()}`;
            } else {
                periodKey = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            }

            // Ensure the period exists in the quantitiesByPeriod object
            if (!quantitiesByPeriod[periodKey]) {
                quantitiesByPeriod[periodKey] = 0;
            }

            // Add the absolute quantity for the current order to the correct period
            quantitiesByPeriod[periodKey] += Math.abs(parseInt(order.Quantity));
        }
    });

    return quantitiesByPeriod;
}

// Function to filter data for the clicked month
function filterDataForMonth(year, month) {
    const filteredData = {};
    
    const fromDate = new Date(year, month - 1, 1); // First day of the month
    const toDate = new Date(year, month, 0); // Last day of the month

    // Use the jsonData variable directly
    const quantitiesByPeriod = processData(jsonData, fromDate, toDate, 'daily'); // Process data for daily period
    
    // Only update the chart if there's valid data
    if (Object.keys(quantitiesByPeriod).length > 0) {
        Object.keys(quantitiesByPeriod).forEach(key => {
            filteredData[key] = quantitiesByPeriod[key]; // Copy filtered data
        });

        // Generate the chart with the filtered data
        generateChart(filteredData);
    }
}

// Main function to show the product sales chart
function showProduct() {
    let fromDateVal = new Date(document.getElementById('date-from').value);
    let endDateVal = new Date(document.getElementById('date-to').value);
    const tPeriod = 'yearly'; // Always show yearly for all years on upload

    let fromDate;
    let endDate;

    // Create default dates
    const defaultFromDate = new Date('2020-01-01');
    const defaultEndDate = new Date();

    // Initialize fromDate based on input
    if (fromDateVal) {
        fromDate = new Date(fromDateVal);
        if (isNaN(fromDate.getTime())) {
            console.warn('Invalid from date format detected. Using default from date.');
            fromDate = defaultFromDate; // Reset to default from date if invalid
        }
    } else {
        fromDate = defaultFromDate; // Use default if no input
    }

    // Initialize endDate based on input
    if (endDateVal) {
        endDate = new Date(endDateVal);
        if (isNaN(endDate.getTime())) {
            console.warn('Invalid end date format detected. Using default end date.');
            endDate = defaultEndDate; // Reset to default end date if invalid
        }
    } else {
        endDate = defaultEndDate; // Use default if no input
    }

    // Process data for the specified time period
    const quantitiesByPeriod = processData(jsonData, fromDate, endDate, tPeriod);
    
    // Generate the chart
    generateChart(quantitiesByPeriod);

}

document.getElementById('time-period').addEventListener('change', function() {
    isMonthly = false; // Reset the flag whenever the time period changes
});

