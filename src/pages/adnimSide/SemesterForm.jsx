import React, { useState, useEffect } from "react";
import { Button, Modal, Form } from "react-bootstrap";
import api from "../../api/api";
import { toast } from "react-toastify";

const SemesterForm = ({ show, onHide, fetchSemesters, editingSemester }) => {
  const [formData, setFormData] = useState({
    name: "",
    season: "",
    startDate: "",
    endDate: "",
    active: false,
  });

  // ⭐ FIX: UPDATE FORM WHEN editingSemester CHANGES
  useEffect(() => {
    if (editingSemester) {
      setFormData({
        name: editingSemester.name || "",
        season: editingSemester.season || "",
        startDate: editingSemester.startDate?.slice(0, 10) || "",
        endDate: editingSemester.endDate?.slice(0, 10) || "",
        active: editingSemester.active || false,
      });
    } else {
      // Reset when adding new semester
      setFormData({
        name: "",
        season: "",
        startDate: "",
        endDate: "",
        active: false,
      });
    }
  }, [editingSemester, show]);
  // 👆 also reset when modal opens

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        await api.put(`/semesters/${editingSemester._id}`, formData);
        toast.success("Semester updated!");
      } else {
        await api.post("/semesters/create", formData);
        toast.success("Semester created!");
      }
      fetchSemesters();
      onHide();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error saving semester");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editingSemester ? "Edit Semester" : "Add Semester"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Season</Form.Label>
            <Form.Select
              name="season"
              value={formData.season}
              onChange={handleChange}
              required
            >
              <option value="">Select Season</option>
              <option value="Harmattan">Harmattan</option>
              <option value="Rain">Rain</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              label="Active Semester"
            />
          </Form.Group>

          <Button type="submit" className="w-100">
            {editingSemester ? "Update Semester" : "Create Semester"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SemesterForm;
