import { Badge, Dropdown, Table, useTheme } from "flowbite-react";
import type { FC } from "react";
import Chart from "react-apexcharts";
import "svgmap/dist/svgMap.min.css";
import NavbarSidebarLayout from "../layouts/navbar-sidebar";

const DashboardPage: FC = function () {
  return (
    <NavbarSidebarLayout>
      <div className="px-4 pt-6">
        <SalesThisWeek />
        <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NewProductsThisWeek />
          <VisitorsThisWeek />
          <UserSignupsThisWeek />
        </div>
        <div className="my-4 grid grid-cols-1 xl:gap-4 2xl:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
            <LatestCustomers />
            <AcquisitionOverview />
          </div>
        </div>
        <Transactions />
      </div>
    </NavbarSidebarLayout>
  );
};

const SalesThisWeek: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="shrink-0">
          <span className="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
            $45,385
          </span>
          <h3 className="text-base font-normal text-gray-600 dark:text-gray-400">
            Sales this week
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-end text-base font-bold text-green-600 dark:text-green-400">
          12.5%
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <SalesChart />
      <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Sales Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const SalesChart: FC = function () {
  const { mode } = useTheme();
  const isDarkTheme = mode === "dark";

  const borderColor = isDarkTheme ? "#374151" : "#F3F4F6";
  const labelColor = isDarkTheme ? "#93ACAF" : "#6B7280";
  const opacityFrom = isDarkTheme ? 0 : 0.45;
  const opacityTo = isDarkTheme ? 0.15 : 0;

  const options: ApexCharts.ApexOptions = {
    stroke: {
      curve: "smooth",
    },
    chart: {
      type: "area",
      fontFamily: "Inter, sans-serif",
      foreColor: labelColor,
      toolbar: {
        show: false,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom,
        opacityTo,
        type: "vertical",
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      style: {
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
    },
    grid: {
      show: true,
      borderColor: borderColor,
      strokeDashArray: 1,
      padding: {
        left: 35,
        bottom: 15,
      },
    },
    markers: {
      size: 5,
      strokeColors: "#ffffff",
      hover: {
        size: undefined,
        sizeOffset: 3,
      },
    },
    xaxis: {
      categories: [
        "01 Feb",
        "02 Feb",
        "03 Feb",
        "04 Feb",
        "05 Feb",
        "06 Feb",
        "07 Feb",
      ],
      labels: {
        style: {
          colors: [labelColor],
          fontSize: "14px",
          fontWeight: 500,
        },
      },
      axisBorder: {
        color: borderColor,
      },
      axisTicks: {
        color: borderColor,
      },
      crosshairs: {
        show: true,
        position: "back",
        stroke: {
          color: borderColor,
          width: 1,
          dashArray: 10,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: [labelColor],
          fontSize: "14px",
          fontWeight: 500,
        },
        formatter: function (value) {
          return "$" + value;
        },
      },
    },
    legend: {
      fontSize: "14px",
      fontWeight: 500,
      fontFamily: "Inter, sans-serif",
      labels: {
        colors: [labelColor],
      },
      itemMargin: {
        horizontal: 10,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          xaxis: {
            labels: {
              show: false,
            },
          },
        },
      },
    ],
  };
  const series = [
    {
      name: "Revenue",
      data: [6356, 6218, 6156, 6526, 6356, 6256, 6056],
      color: "#1A56DB",
    },
    {
      name: "Revenue (previous period)",
      data: [6556, 6725, 6424, 6356, 6586, 6756, 6616],
      color: "#FDBA8C",
    },
  ];

  return <Chart height={420} options={options} series={series} type="area" />;
};

const Datepicker: FC = function () {
  return (
    <span className="text-sm text-gray-600">
      <Dropdown inline label="Last 7 days">
        <Dropdown.Item>
          <strong>Sep 16, 2021 - Sep 22, 2021</strong>
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item>Yesterday</Dropdown.Item>
        <Dropdown.Item>Today</Dropdown.Item>
        <Dropdown.Item>Last 7 days</Dropdown.Item>
        <Dropdown.Item>Last 30 days</Dropdown.Item>
        <Dropdown.Item>Last 90 days</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item>Custom...</Dropdown.Item>
      </Dropdown>
    </span>
  );
};

const NewProductsThisWeek: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <div className="flex items-center">
        <div className="shrink-0">
          <span className="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
            2,340
          </span>
          <h3 className="text-base font-normal text-gray-600 dark:text-gray-400">
            New products this week
          </h3>
        </div>
        <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-green-600 dark:text-green-400">
          14.6%
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <NewProductsChart />
      <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Products Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const NewProductsChart: FC = function () {
  const options: ApexCharts.ApexOptions = {
    colors: ["#1A56DB", "#FDBA8C"],
    chart: {
      fontFamily: "Inter, sans-serif",
      foreColor: "#4B5563",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "50%",
        borderRadius: 3,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 1,
        },
      },
    },
    stroke: {
      show: true,
      width: 5,
      colors: ["transparent"],
    },
    grid: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    xaxis: {
      floating: true,
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      opacity: 1,
    },
  };
  const series = [
    {
      name: "Digital",
      color: "#1A56DB",
      data: [
        { x: "01 Feb", y: 170 },
        { x: "02 Feb", y: 180 },
        { x: "03 Feb", y: 164 },
        { x: "04 Feb", y: 145 },
        { x: "05 Feb", y: 174 },
        { x: "06 Feb", y: 170 },
        { x: "07 Feb", y: 155 },
      ],
    },
    {
      name: "Goods",
      color: "#FDBA8C",
      data: [
        { x: "01 Feb", y: 120 },
        { x: "02 Feb", y: 134 },
        { x: "03 Feb", y: 167 },
        { x: "04 Feb", y: 179 },
        { x: "05 Feb", y: 145 },
        { x: "06 Feb", y: 182 },
        { x: "07 Feb", y: 143 },
      ],
    },
  ];

  return <Chart height={305} options={options} series={series} type="bar" />;
};

const VisitorsThisWeek: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <div className="flex items-center">
        <div className="shrink-0">
          <span className="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
            5,355
          </span>
          <h3 className="text-base font-normal text-gray-600 dark:text-gray-400">
            Visitors this week
          </h3>
        </div>
        <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-green-600 dark:text-green-400">
          32.9%
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <VisitorsChart />
      <div className="mt-3.5 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Visits Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const VisitorsChart: FC = function () {
  const { mode } = useTheme();
  const isDarkTheme = mode === "dark";

  const fillGradientShade = isDarkTheme ? "dark" : "light";
  const fillGradientShadeIntensity = isDarkTheme ? 0.45 : 1;

  const options: ApexCharts.ApexOptions = {
    labels: [
      "01 Feb",
      "02 Feb",
      "03 Feb",
      "04 Feb",
      "05 Feb",
      "06 Feb",
      "07 Feb",
    ],
    chart: {
      fontFamily: "Inter, sans-serif",
      sparkline: {
        enabled: true,
      },
      toolbar: {
        show: false,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: fillGradientShade,
        shadeIntensity: fillGradientShadeIntensity,
      },
    },
    plotOptions: {
      area: {
        fillTo: "end",
      },
    },
    theme: {
      monochrome: {
        enabled: true,
        color: "#1A56DB",
      },
    },
    tooltip: {
      style: {
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
    },
  };
  const series = [
    {
      name: "Visitors",
      data: [500, 590, 600, 520, 610, 550, 600],
    },
  ];

  return <Chart height={305} options={options} series={series} type="area" />;
};

const UserSignupsThisWeek: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <div className="flex items-center">
        <div className="shrink-0">
          <span className="text-2xl font-bold leading-none text-gray-900 dark:text-white sm:text-3xl">
            385
          </span>
          <h3 className="text-base font-normal text-gray-600 dark:text-gray-400">
            User signups this week
          </h3>
        </div>
        <div className="ml-5 flex w-0 flex-1 items-center justify-end text-base font-bold text-red-600 dark:text-red-400">
          -2.7%
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <UserSignupsChart />
      <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Users Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const UserSignupsChart: FC = function () {
  const { mode } = useTheme();
  const isDarkTheme = mode === "dark";

  const backgroundBarColors = isDarkTheme
    ? [
        "#374151",
        "#374151",
        "#374151",
        "#374151",
        "#374151",
        "#374151",
        "#374151",
      ]
    : [
        "#E5E7EB",
        "#E5E7EB",
        "#E5E7EB",
        "#E5E7EB",
        "#E5E7EB",
        "#E5E7EB",
        "#E5E7EB",
      ];

  const options: ApexCharts.ApexOptions = {
    labels: [
      "01 Feb",
      "02 Feb",
      "03 Feb",
      "04 Feb",
      "05 Feb",
      "06 Feb",
      "07 Feb",
    ],
    chart: {
      foreColor: "#4B5563",
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
    },
    theme: {
      monochrome: {
        enabled: true,
        color: "#1A56DB",
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "25%",
        borderRadius: 3,
        colors: {
          backgroundBarColors,
          backgroundBarRadius: 3,
        },
      },
    },
    xaxis: {
      floating: true,
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 0.8,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  };
  const series = [
    {
      name: "Users",
      data: [34, 45, 53, 38, 55, 32, 36],
    },
  ];

  return <Chart height={305} options={options} series={series} type="bar" />;
};

const LatestCustomers: FC = function () {
  return (
    <div className="mb-4 h-full rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Latest Customers
        </h3>
        <a
          href="#"
          className="inline-flex items-center rounded-lg p-2 text-sm font-medium text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700"
        >
          View all
        </a>
      </div>
      <div className="flow-root">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <img
                  className="h-8 w-8 rounded-full"
                  src="../images/users/neil-sims.png"
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  Neil Sims
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  email@flowbite.com
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                $320
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <img
                  className="h-8 w-8 rounded-full"
                  src="../images/users/bonnie-green.png"
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  Bonnie Green
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  email@flowbite.com
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                $3467
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <img
                  className="h-8 w-8 rounded-full"
                  src="../images/users/michael-gough.png"
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  Michael Gough
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  email@flowbite.com
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                $67
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <img
                  className="h-8 w-8 rounded-full"
                  src="../images/users/thomas-lean.png"
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  Thomes Lean
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  email@flowbite.com
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                $2367
              </div>
            </div>
          </li>
          <li className="py-3 sm:py-4">
            <div className="flex items-center space-x-4">
              <div className="shrink-0">
                <img
                  className="h-8 w-8 rounded-full"
                  src="../images/users/lana-byrd.png"
                  alt=""
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  Lana Byrd
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  email@flowbite.com
                </p>
              </div>
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                $367
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Sales Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const AcquisitionOverview: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <h3 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
        Acquisition Overview
      </h3>
      <div className="my-6">
        <AcquisitionChart />
      </div>
      <div className="flex flex-col">
        <div className="overflow-x-auto rounded-lg">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow sm:rounded-lg">
              <Table className="min-w-full table-fixed">
                <Table.Head>
                  <Table.HeadCell className="whitespace-nowrap rounded-l border-x-0 bg-gray-50 px-4 py-3 text-left align-middle text-xs font-semibold uppercase text-gray-700 dark:bg-gray-700 dark:text-white">
                    Top Channels
                  </Table.HeadCell>
                  <Table.HeadCell className="whitespace-nowrap border-x-0 bg-gray-50 px-4 py-3 text-left align-middle text-xs font-semibold uppercase text-gray-700 dark:bg-gray-700 dark:text-white">
                    Users
                  </Table.HeadCell>
                  <Table.HeadCell className="min-w-[140px] whitespace-nowrap rounded-r border-x-0 bg-gray-50 px-4 py-3 text-left align-middle text-xs font-semibold uppercase text-gray-700 dark:bg-gray-700 dark:text-white">
                    Acquisition
                  </Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y divide-gray-100 dark:divide-gray-700">
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Organic Search
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      5,649
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">30%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-primary-700"
                              style={{ width: "30%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Referral
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      4,025
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">24%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-orange-300"
                              style={{ width: "24%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Direct
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      3,105
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">18%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-teal-400"
                              style={{ width: "18%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Social
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      1251
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">12%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-pink-600"
                              style={{ width: "12%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Other
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      734
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">9%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-indigo-600"
                              style={{ width: "9%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row className="text-gray-500 dark:text-gray-400">
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 text-left align-middle text-sm font-normal">
                      Email
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs font-medium text-gray-900 dark:text-white">
                      456
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap border-t-0 p-4 align-middle text-xs">
                      <div className="flex items-center">
                        <span className="mr-2 text-xs font-medium">7%</span>
                        <div className="relative w-full">
                          <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-sm bg-purple-500"
                              style={{ width: "7%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Acquisition Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

const AcquisitionChart: FC = function () {
  const { mode } = useTheme();
  const isDarkTheme = mode === "dark";

  const options: ApexCharts.ApexOptions = {
    labels: ["Organic", "Referral", "Direct", "Social", "Other", "Email"],
    colors: ["#16BDCA", "#FDBA8C", "#1A56DB", "#D61F69", "#9061F9", "#6875F5"],
    chart: {
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      colors: [isDarkTheme ? "#111827" : "#fff"],
    },
    plotOptions: {
      pie: {
        donut: {
          size: "5%",
        },
      },
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 0.9,
        },
      },
    },
    tooltip: {
      shared: true,
      followCursor: false,
      fillSeriesColor: false,
      inverseOrder: true,
      style: {
        fontSize: "14px",
        fontFamily: "Inter, sans-serif",
      },
      x: {
        show: true,
        formatter: function (_, { seriesIndex, w }) {
          const label = w.config.labels[seriesIndex];
          return label;
        },
      },
      y: {
        formatter: function (value) {
          return value + "%";
        },
      },
    },
    grid: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  };
  const series = [30, 24, 18, 12, 9, 7];

  return <Chart height={305} options={options} series={series} type="donut" />;
};

const Transactions: FC = function () {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6 xl:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Transactions
          </h3>
          <span className="text-base font-normal text-gray-600 dark:text-gray-400">
            This is a list of latest transactions
          </span>
        </div>
        <div className="shrink-0">
          <a
            href="#"
            className="rounded-lg p-2 text-sm font-medium text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700"
          >
            View all
          </a>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="overflow-x-auto rounded-lg">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow sm:rounded-lg">
              <Table
                striped
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-600"
              >
                <Table.Head className="bg-gray-50 dark:bg-gray-700">
                  <Table.HeadCell>Transaction</Table.HeadCell>
                  <Table.HeadCell>Date &amp; Time</Table.HeadCell>
                  <Table.HeadCell>Amount</Table.HeadCell>
                  <Table.HeadCell>Status</Table.HeadCell>
                </Table.Head>
                <Table.Body className="bg-white dark:bg-gray-800">
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Bonnie Green</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 23, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $2300
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment refund to{" "}
                      <span className="font-semibold">#00910</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 23, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      -$670
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment failed from{" "}
                      <span className="font-semibold">#087651</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 18, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $234
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="failure">Cancelled</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Lana Byrd</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 15, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $5000
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <span className="mr-2 rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-200">
                        In progress
                      </span>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Jese Leos</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 15, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $2300
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">THEMESBERG LLC</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 11, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $560
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Lana Lysle</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 6, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $1437
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment to{" "}
                      <span className="font-semibold">Joseph Mcfall</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Apr 1, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $980
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Alphabet LLC</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Mar 23, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $11,436
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <span className="mr-2 rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-200">
                        In progress
                      </span>
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-900 dark:text-white">
                      Payment from{" "}
                      <span className="font-semibold">Bonnie Green</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-normal text-gray-500 dark:text-gray-400">
                      Mar 23, 2021
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap p-4 text-sm font-semibold text-gray-900 dark:text-white">
                      $560
                    </Table.Cell>
                    <Table.Cell className="flex whitespace-nowrap p-4">
                      <Badge color="success">Completed</Badge>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 sm:pt-6">
        <Datepicker />
        <div className="shrink-0">
          <a
            href="#"
            className="inline-flex items-center rounded-lg p-2 text-xs font-medium uppercase text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700 sm:text-sm"
          >
            Transactions Report
            <svg
              className="ml-1 h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
