const ctx = document.getElementById("myChart");

// Just some Example output, this isn't the final output.
new Chart(ctx, {
  type: "line",
  data: {
    labels: [
      "January",
      "Febuary",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
    ],
    datasets: [
      {
        label: "# of Absences",
        data: [5, 5, 6, 5, 5, 6, 12, 6, 3],
        borderWidth: 1,
        tension: 0.3,
        borderColor: "rgba(207, 51, 90, 1)",
        backgroundColor: "rgba(235, 97, 132, 1)",
      },
      {
        label: "# of Tardiness",
        data: [2, 4, 5, 4, 2, 6, 8, 5, 3, 3],
        borderWidth: 1,
        tension: 0.3,
        borderColor: "rgba(212, 193, 16, 1)",
        backgroundColor: "rgba(238, 227, 124, 1)",
      },
      {
        label: "# of Leave",
        data: [1, 4, 2, 1, 5, 2, 2, 1, 1, 2],
        borderWidth: 1,
        tension: 0.3,
        borderColor: "rgba(16, 84, 212, 1)",
        backgroundColor: "rgba(78, 136, 243, 1)",
      },
    ],
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    layout: {
      padding: 20,
    },
  },
});
