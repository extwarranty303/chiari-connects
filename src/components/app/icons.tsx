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
      viewBox="0 0 160 70"
      {...props}>
      <title>Chiari Connect Logo</title>
      <text x="0" y="30" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="bold" fill="hsl(var(--primary))">Chiari</text>
      <text x="68" y="30" fontFamily="Inter, sans-serif" fontSize="24" fill="#50e3c2">Connect</text>
      
      <g transform="translate(110, 4)">
          <g strokeWidth="0.5" stroke="#4a90e2">
            <circle cx="25" cy="25" r="14" fill="none" stroke="none" />
            <circle cx="25" cy="11" r="1.5" fill="#4a90e2" stroke="none" />
            <circle cx="34" cy="15" r="1.5" fill="#4a90e2" stroke="none" />
            <circle cx="16" cy="15" r="1.5" fill="white" stroke="#4a90e2" />
            <circle cx="40" cy="22" r="1.5" fill="#4a90e2" stroke="none" />
            <circle cx="10" cy="22" r="1.5" fill="white" stroke="#4a90e2" />
            <circle cx="41" cy="30" r="1.5" fill="#50e3c2" stroke="none" />
            <circle cx="9" cy="30" r="1.5" fill="#50e3c2" stroke="none" />
            <circle cx="37" cy="38" r="1.5" fill="#b8e986" stroke="none" />
            <circle cx="13" cy="38" r="1.5" fill="white" stroke="#b8e986" />
            <circle cx="30" cy="43" r="1.5" fill="#b8e986" stroke="none" />
            <circle cx="20" cy="43" r="1.5" fill="#b8e986" stroke="none" />

            <path d="M25 11 a14,14 0 0,1 9,4" fill="none" />
            <path d="M34 15 a14,14 0 0,1 6,7" fill="none" />
            <path d="M16 15 a14,14 0 0,0 -6,7" fill="none" />
            <path d="M40 22 a14,14 0 0,1 1,8" fill="none" stroke="#50e3c2" />
            <path d="M10 22 a14,14 0 0,0 -1,8" fill="none" stroke="#50e3c2" />
            <path d="M41 30 a14,14 0 0,1 -4,8" fill="none" stroke="#b8e986" />
            <path d="M9 30 a14,14 0 0,0 4,8" fill="none" stroke="#b8e986" />
            <path d="M37 38 a14,14 0 0,1 -7,5" fill="none" stroke="#b8e986" />
            <path d="M13 38 a14,14 0 0,0 7,5" fill="none" stroke="#b8e986" />
          </g>
          
          <path d="M 25 18 C 30 23, 20 28, 25 33 C 30 38, 20 43, 25 48" stroke="#0b3d91" strokeWidth="0.8" fill="none" />
          <path d="M 25 18 C 20 23, 30 28, 25 33 C 20 38, 30 43, 25 48" stroke="#0b3d91" strokeWidth="0.8" fill="none" transform="translate(1, -0.5)" />
      </g>
      
      <text x="0" y="55" fontFamily="sans-serif" fontSize="8" fill="#a0aec0">
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
