// attendance-data.js

//  Updated Raw Time Logs with Cutoff Period
export const rawTimeLogsData = [
  {
    "Date": "2025-08-21",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "8:07",
    "Time Out": "17:10",
    "Late (m)": 7,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Aug 16 - 31, 2025"
  },
  {
    "Date": "2025-08-28",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "8:00",
    "Time Out": "17:00",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Aug 16 - 31, 2025"
  },
  {
    "Date": "2025-09-23",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "9:15",
    "Time Out": "16:50",
    "Late (m)": 75,
    "Undertime": 10,
    "Status": "Present",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-09-24",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "8:02",
    "Time Out": "",
    "Late (m)": 2,
    "Undertime": 0,
    "Status": "Undertime",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-09-25",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "",
    "Time Out": "",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Absent",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-09-25",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "",
    "Time Out": "",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Official Business",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-09-25",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "",
    "Time Out": "",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Leave with Pay",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-09-25",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "",
    "Time Out": "",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Leave w/o Pay",
    "Cutoff Period": "Sep 16 - 30, 2025"
  },
  {
    "Date": "2025-10-02",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "8:05",
    "Time Out": "17:10",
    "Late (m)": 5,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 1 - 15, 2025"
  },
  {
    "Date": "2025-10-03",
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Time In": "8:00",
    "Time Out": "17:00",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 1 - 15, 2025"
  },
  {
    "Date": "2025-10-05",
    "Employee ID": "010012",
    "Name": "Santos, Maria",
    "Time In": "8:10",
    "Time Out": "17:05",
    "Late (m)": 10,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 1 - 15, 2025"
  },
  {
    "Date": "2025-10-17",
    "Employee ID": "010013",
    "Name": "Reyes, Pedro",
    "Time In": "7:55",
    "Time Out": "17:00",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Date": "2025-10-20",
    "Employee ID": "010014",
    "Name": "Garcia, Ana",
    "Time In": "8:10",
    "Time Out": "17:15",
    "Late (m)": 10,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Date": "2025-10-25",
    "Employee ID": "010015",
    "Name": "Lopez, Carlos",
    "Time In": "8:00",
    "Time Out": "17:00",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Date": "2025-11-02",
    "Employee ID": "010016",
    "Name": "Ramos, Sofia",
    "Time In": "8:03",
    "Time Out": "17:08",
    "Late (m)": 3,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Nov 1 - 15, 2025"
  },
  {
    "Date": "2025-11-03",
    "Employee ID": "010017",
    "Name": "Torres, Miguel",
    "Time In": "8:00",
    "Time Out": "17:00",
    "Late (m)": 0,
    "Undertime": 0,
    "Status": "Present",
    "Cutoff Period": "Nov 1 - 15, 2025"
  }
];

//  Updated Attendance Summary with Cutoff Period
export const attendanceSummaryData = [
  {
    "Employee ID": "010011",
    "Name": "Dela Cruz, Juan",
    "Regular Hours": 160,
    "Overtime": 17,
    "Late": 2,
    "Undertime": 0,
    "Leave w/ Pay": 0,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 1,
    "Absences": 0,
    "Cutoff Period": "Oct 1 - 15, 2025"
  },
  {
    "Employee ID": "010012",
    "Name": "Santos, Maria",
    "Regular Hours": 160,
    "Overtime": 2,
    "Late": 5,
    "Undertime": 0,
    "Leave w/ Pay": 1,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 0,
    "Absences": 0,
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Employee ID": "010013",
    "Name": "Reyes, Pedro",
    "Regular Hours": 160,
    "Overtime": 0,
    "Late": 0,
    "Undertime": 0,
    "Leave w/ Pay": 0,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 0,
    "Absences": 1,
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Employee ID": "010014",
    "Name": "Garcia, Ana",
    "Regular Hours": 152,
    "Overtime": 1,
    "Late": 10,
    "Undertime": 5,
    "Leave w/ Pay": 0,
    "Leave w/o Pay": 1,
    "Incomplete (Days)": 2,
    "Absences": 0,
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Employee ID": "010015",
    "Name": "Lopez, Carlos",
    "Regular Hours": 160,
    "Overtime": 0,
    "Late": 0,
    "Undertime": 0,
    "Leave w/ Pay": 2,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 0,
    "Absences": 0,
    "Cutoff Period": "Oct 16 - 31, 2025"
  },
  {
    "Employee ID": "010016",
    "Name": "Ramos, Sofia",
    "Regular Hours": 160,
    "Overtime": 3,
    "Late": 15,
    "Undertime": 0,
    "Leave w/ Pay": 0,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 1,
    "Absences": 0,
    "Cutoff Period": "Nov 1 - 15, 2025"
  },
  {
    "Employee ID": "010017",
    "Name": "Torres, Miguel",
    "Regular Hours": 144,
    "Overtime": 0,
    "Late": 0,
    "Undertime": 0,
    "Leave w/ Pay": 1,
    "Leave w/o Pay": 0,
    "Incomplete (Days)": 0,
    "Absences": 2,
    "Cutoff Period": "Nov 1 - 15, 2025"
  }
];