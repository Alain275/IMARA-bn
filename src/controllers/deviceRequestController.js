import { DeviceRequest } from '../models/DeviceRequest.js';
import { sendEmail } from '../services/emailService.js';

// Create a new device request
export async function createDeviceRequest(req, res) {
  try {
    const { name, email, phone, province, district, sector, cell, village, farmSize, devices, message } = req.body;
    
    const deviceRequest = await DeviceRequest.create({
      name,
      email,
      phone,
      province,
      district,
      sector,
      cell,
      village,
      farmSize,
      devices,
      message,
      userId: req.user?._id // If user is logged in
    });
    
    // Send confirmation email to customer
    const customerEmailHtml = `
      <h2>Device Request Confirmation</h2>
      <p>Dear ${name},</p>
      <p>Thank you for your interest in SmartFarmX IoT devices! We have received your request.</p>
      
      <h3>Request Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Location:</strong> ${province}, ${district}${sector ? `, ${sector}` : ''}${cell ? `, ${cell}` : ''}${village ? `, ${village}` : ''}</li>
        ${farmSize ? `<li><strong>Farm Size:</strong> ${farmSize}</li>` : ''}
        <li><strong>Devices Requested:</strong> ${devices.join(', ')}</li>
        ${message ? `<li><strong>Message:</strong> ${message}</li>` : ''}
      </ul>
      
      <p>Our team will review your request and contact you within 24-48 hours.</p>
      
      <p>Best regards,<br>SmartFarmX Team</p>
    `;
    
    await sendEmail({
      to: email,
      subject: 'IMARA — device request received',
      html: customerEmailHtml,
      category: 'system',
      trigger: 'device_request_confirmation',
    });
    
    // Send notification to admin
    const adminEmailHtml = `
      <h2>New Device Request</h2>
      <p>A new device request has been submitted:</p>
      
      <h3>Customer Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Location:</strong> ${province}, ${district}${sector ? `, ${sector}` : ''}${cell ? `, ${cell}` : ''}${village ? `, ${village}` : ''}</li>
        ${farmSize ? `<li><strong>Farm Size:</strong> ${farmSize}</li>` : ''}
        <li><strong>Devices Requested:</strong> ${devices.join(', ')}</li>
        ${message ? `<li><strong>Message:</strong> ${message}</li>` : ''}
      </ul>
      
      <p>Please review and respond to this request in the admin panel.</p>
    `;
    
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@smartfarmx.com',
      subject: 'New device request — IMARA',
      html: adminEmailHtml,
      category: 'system',
      trigger: 'device_request_staff',
    });
    
    res.status(201).json(deviceRequest);
  } catch (error) {
    console.error('Error creating device request:', error);
    res.status(500).json({ error: 'Failed to create device request' });
  }
}

// Get all device requests (admin only)
export async function getAllDeviceRequests(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    
    const requests = await DeviceRequest.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const count = await DeviceRequest.countDocuments(query);
    
    res.json({
      requests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching device requests:', error);
    res.status(500).json({ error: 'Failed to fetch device requests' });
  }
}

// Get single device request
export async function getDeviceRequest(req, res) {
  try {
    const { id } = req.params;
    const request = await DeviceRequest.findById(id).populate('userId', 'name email phone').lean();
    
    if (!request) {
      return res.status(404).json({ error: 'Device request not found' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error fetching device request:', error);
    res.status(500).json({ error: 'Failed to fetch device request' });
  }
}

// Update device request status (admin only)
export async function updateDeviceRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const request = await DeviceRequest.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true, runValidators: true }
    ).lean();
    
    if (!request) {
      return res.status(404).json({ error: 'Device request not found' });
    }
    
    // Send status update email to customer
    const statusMessages = {
      contacted: 'We have contacted you regarding your device request.',
      approved: 'Your device request has been approved! We will proceed with the next steps.',
      rejected: 'Unfortunately, we cannot fulfill your device request at this time.',
      completed: 'Your device request has been completed. Thank you for choosing SmartFarmX!'
    };
    
    if (statusMessages[status]) {
      const emailHtml = `
        <h2>Device Request Update</h2>
        <p>Dear ${request.name},</p>
        <p>${statusMessages[status]}</p>
        ${adminNotes ? `<p><strong>Note:</strong> ${adminNotes}</p>` : ''}
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>SmartFarmX Team</p>
      `;
      
      await sendEmail({
        to: request.email,
        subject: `IMARA — device request update: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        html: emailHtml,
        category: 'system',
        trigger: `device_request_${status}`,
      });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error updating device request:', error);
    res.status(500).json({ error: 'Failed to update device request' });
  }
}

// Delete device request (admin only)
export async function deleteDeviceRequest(req, res) {
  try {
    const { id } = req.params;
    const request = await DeviceRequest.findByIdAndDelete(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Device request not found' });
    }
    
    res.json({ message: 'Device request deleted successfully' });
  } catch (error) {
    console.error('Error deleting device request:', error);
    res.status(500).json({ error: 'Failed to delete device request' });
  }
}
