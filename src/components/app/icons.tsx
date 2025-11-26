import type { SVGProps } from 'react';

/**
 * @fileoverview This file contains a collection of SVG icons used throughout the application.
 * The `Icons` object exports each icon as a functional React component, making them easy to
 * import and use with consistent styling and accessibility properties.
 */

export const Icons = {
  /**
   * The main logo for the Chiari Connects application.
   * It features a stylized representation of a brain or neural network,
   * symbolizing connectivity and analysis.
   */
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 70"
      {...props}
    >
      <title>Chiari Connects Logo</title>
      {/* Circle with nodes */}
      <g strokeWidth="0.5" stroke="#4a90e2">
        {/* Top arc */}
        <circle cx="50" cy="35" r="14" fill="none" stroke="none" />
        <circle cx="50" cy="21" r="1.5" fill="#4a90e2" stroke="none" />
        <circle cx="59" cy="25" r="1.5" fill="#4a90e2" stroke="none" />
        <circle cx="41" cy="25" r="1.5" fill="white" stroke="#4a90e2" />
        <circle cx="65" cy="32" r="1.5" fill="#4a90e2" stroke="none" />
        <circle cx="35" cy="32" r="1.5" fill="white" stroke="#4a90e2" />
        <circle cx="66" cy="40" r="1.5" fill="#50e3c2" stroke="none" />
        <circle cx="34" cy="40" r="1.5" fill="#50e3c2" stroke="none" />
        <circle cx="62" cy="48" r="1.5" fill="#b8e986" stroke="none" />
        <circle cx="38" cy="48" r="1.5" fill="white" stroke="#b8e986" />
        <circle cx="55" cy="53" r="1.5" fill="#b8e986" stroke="none" />
        <circle cx="45" cy="53" r="1.5" fill="#b8e986" stroke="none" />

        <path d="M50 21 a14,14 0 0,1 9,4" fill="none" />
        <path d="M59 25 a14,14 0 0,1 6,7" fill="none" />
        <path d="M41 25 a14,14 0 0,0 -6,7" fill="none" />
        <path d="M65 32 a14,14 0 0,1 1,8" fill="none" stroke="#50e3c2" />
        <path d="M35 32 a14,14 0 0,0 -1,8" fill="none" stroke="#50e3c2" />
        <path d="M66 40 a14,14 0 0,1 -4,8" fill="none" stroke="#b8e986" />
        <path d="M34 40 a14,14 0 0,0 4,8" fill="none" stroke="#b8e986" />
        <path d="M62 48 a14,14 0 0,1 -7,5" fill="none" stroke="#b8e986" />
        <path d="M38 48 a14,14 0 0,0 7,5" fill="none" stroke="#b8e986" />
      </g>
      
      {/* Inner "S" shape */}
      <path 
        d="M 50 28 C 55 33, 45 38, 50 43 C 55 48, 45 53, 50 58"
        stroke="#0b3d91"
        strokeWidth="0.8"
        fill="none"
      />
      <path 
        d="M 50 28 C 45 33, 55 38, 50 43 C 45 48, 55 53, 50 58"
        stroke="#0b3d91"
        strokeWidth="0.8"
        fill="none"
        transform="translate(1, -0.5)"
      />
      
       {/* Powered by text */}
      <text x="50" y="65" fontFamily="sans-serif" fontSize="6" fill="#a0aec0" textAnchor="middle">
        Powered by chiarivoices.org
      </text>

    </svg>
  ),
  /**
   * The Google 'G' logo, used for the Google Sign-In button.
   */
  google: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="48px"
      height="48px"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,36.45,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  ),
};
