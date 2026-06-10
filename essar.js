  const form = document.getElementById('contactForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const response = await fetch(form.action, {
      method: form.method,
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      // alert('Thank you! Our team will contact you shortly.');
      window.location.href = 'thankyou.html';   // redirect to your thank you page
    } else {
      alert('Something went wrong. Please try again or call us directly.');
    }
  });
