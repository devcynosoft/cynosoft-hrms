import React from 'react'
import { supabase } from './supabaseClient';

const getEmployeeId = async () => {
    const { data, error } = await supabase
    .from('employees') // Assuming the table is called 'employees'
    .select('emp_id')
    .order('emp_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching emp_id:', error.message);
    return null;
  }

  let newEmpId = '001'; // Default emp_id if no records exist

  if (data && data.length > 0) {
    const latestEmpId = data[0].emp_id;
    // Increment the latest emp_id and format it with leading zeros
    newEmpId = (parseInt(latestEmpId) + 1).toString().padStart(3, '0');
  }

  return newEmpId;
}

export default getEmployeeId