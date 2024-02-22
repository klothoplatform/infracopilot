import { type FC } from "react";
import "chart.js/auto";
import { Line } from "react-chartjs-2";

interface MetricChartProps {
  metricData: any;
}
export const MetricChart: FC<MetricChartProps> = ({ metricData }) => {
  // Prepare the data for the chart
  const labels = metricData.datapoints.map(
    (datapoint: { Timestamp: string | number | Date }) =>
      new Date(datapoint.Timestamp).toLocaleString(),
  );
  const data = metricData.datapoints.map(
    (datapoint: { Average: any }) => datapoint.Average,
  ); // Change this to the statistic you're interested in

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: metricData.metric_name,
        data: data,
        fill: false,
        backgroundColor: "rgb(75, 192, 192)",
        borderColor: "rgba(75, 192, 192, 0.2)",
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Chart.js Line Chart",
      },
    },
  };
  return (
    <div>
      <h2>{metricData.metric_name}</h2>
      {data.length > 0 ? (
        <Line options={options} data={chartData} />
      ) : (
        <p>No data available for this metric</p>
      )}
    </div>
  );
};

export default MetricChart;
