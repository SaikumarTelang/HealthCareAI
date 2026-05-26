class DepartmentRouter {
  constructor() {
    this.departments = {
      'emergency': {
        name: 'Emergency Department',
        doctors: ['Dr. Sarah Chen', 'Dr. Michael Torres'],
        capacity: 20,
        currentLoad: 0
      },
      'cardiology': {
        name: 'Cardiology',
        doctors: ['Dr. James Wilson', 'Dr. Priya Patel'],
        capacity: 15,
        currentLoad: 0
      },
      'neurology': {
        name: 'Neurology',
        doctors: ['Dr. Robert Kim', 'Dr. Lisa Anderson'],
        capacity: 12,
        currentLoad: 0
      },
      'orthopedics': {
        name: 'Orthopedics',
        doctors: ['Dr. David Brown', 'Dr. Emily White'],
        capacity: 15,
        currentLoad: 0
      },
      'gastroenterology': {
        name: 'Gastroenterology',
        doctors: ['Dr. Ahmad Hassan', 'Dr. Maria Garcia'],
        capacity: 10,
        currentLoad: 0
      },
      'pulmonology': {
        name: 'Pulmonology',
        doctors: ["Dr. Kevin O'Brien", 'Dr. Yuki Tanaka'],
        capacity: 10,
        currentLoad: 0
      },
      'obstetrics': {
        name: 'Obstetrics & Gynecology',
        doctors: ['Dr. Rachel Green', 'Dr. Sophia Martinez'],
        capacity: 12,
        currentLoad: 0
      },
      'pediatrics': {
        name: 'Pediatrics',
        doctors: ['Dr. Thomas Lee', 'Dr. Hannah Baker'],
        capacity: 15,
        currentLoad: 0
      },
      'psychiatry': {
        name: 'Psychiatry',
        doctors: ['Dr. Mark Stevens', 'Dr. Jennifer Park'],
        capacity: 8,
        currentLoad: 0
      },
      'dermatology': {
        name: 'Dermatology',
        doctors: ['Dr. Anna Schmidt', 'Dr. Chris Johnson'],
        capacity: 10,
        currentLoad: 0
      },
      'ophthalmology': {
        name: 'Ophthalmology',
        doctors: ['Dr. Raj Gupta', 'Dr. Laura Wilson'],
        capacity: 8,
        currentLoad: 0
      },
      'ent': {
        name: 'ENT (Ear, Nose & Throat)',
        doctors: ['Dr. Steven Chang', 'Dr. Olivia Taylor'],
        capacity: 10,
        currentLoad: 0
      },
      'general-medicine': {
        name: 'General Medicine',
        doctors: ['Dr. John Smith', 'Dr. Susan Davis', 'Dr. Peter Williams'],
        capacity: 25,
        currentLoad: 0
      }
    };
  }

  route(department, priority) {
    const dept = this.departments[department] || this.departments['general-medicine'];
    // Select doctor based on load balancing
    const assignedDoctor = dept.doctors[dept.currentLoad % dept.doctors.length];
    dept.currentLoad++;

    return {
      department: dept.name,
      departmentCode: department,
      assignedDoctor: assignedDoctor,
      estimatedWait: this.getEstimatedWait(priority, dept.currentLoad, dept.capacity),
      queuePosition: dept.currentLoad,
      capacity: dept.capacity
    };
  }

  getEstimatedWait(priority, currentLoad, capacity) {
    const baseWait = {
      'emergency': 0,
      'urgent': 10,
      'semi-urgent': 30,
      'non-urgent': 60
    };
    const loadFactor = currentLoad / capacity;
    const base = baseWait[priority] || 60;
    return Math.round(base * (1 + loadFactor)) + ' minutes';
  }

  getDepartmentInfo(departmentCode) {
    return this.departments[departmentCode] || this.departments['general-medicine'];
  }

  getAllDepartments() {
    return Object.entries(this.departments).map(([code, dept]) => ({
      code,
      ...dept
    }));
  }
}

module.exports = new DepartmentRouter();
