import React, { useEffect } from 'react';
import { Box, Container, Typography, Paper, Divider, IconButton, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';

const TermsConditionsPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', py: 8 }}>
            <Container maxWidth="md">
                <IconButton
                    onClick={() => navigate(-1)}
                    sx={{
                        mb: 2,
                        bgcolor: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                        }
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>

                <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Typography variant="h3" component="h1" fontWeight="800" color="primary" gutterBottom>
                        Terms and Conditions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Last updated: April 22, 2026
                    </Typography>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ '& > p': { mb: 2, lineHeight: 1.7, color: 'text.secondary' }, '& > h2': { mt: 6, mb: 3, fontWeight: 700 }, '& > h3': { mt: 4, mb: 2, fontWeight: 600 } }}>
                        <Typography variant="body1">
                            Please read these terms and conditions carefully before using Our Service.
                        </Typography>

                        <Typography variant="h5" component="h2">Interpretation and Definitions</Typography>
                        <Typography variant="h6" component="h3">Interpretation</Typography>
                        <Typography variant="body1">
                            The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
                        </Typography>

                        <Typography variant="h6" component="h3">Definitions</Typography>
                        <Typography variant="body1">
                            For the purposes of these Terms and Conditions:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li" sx={{ mb: 1 }}><strong>Application</strong> means the software program provided by the Company downloaded by You on any electronic device, named Suthra One</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Application Store</strong> means the digital distribution service operated and developed by Apple Inc. (Apple App Store) or Google Inc. (Google Play Store) in which the Application has been downloaded.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Country</strong> refers to: Florida, United States</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in these Terms and Conditions) refers to Suthra One.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Service</strong> refers to the Application.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Terms and Conditions</strong> (also referred to as "Terms") means these Terms and Conditions, including any documents expressly incorporated by reference, which govern Your access to and use of the Service and form the entire agreement between You and the Company regarding the Service.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Third-Party Social Media Service</strong> means any services or content (including data, information, products or services) provided by a third party that is displayed, included, made available, or linked to through the Service.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</Box>
                        </Box>

                        <Typography variant="h5" component="h2">Acknowledgment</Typography>
                        <Typography variant="body1">
                            These are the Terms and Conditions governing the use of this Service and the agreement between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.
                        </Typography>
                        <Typography variant="body1">
                            Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.
                        </Typography>
                        <Typography variant="body1">
                            By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.
                        </Typography>
                        <Typography variant="body1">
                            You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.
                        </Typography>
                        <Typography variant="body1">
                            Your access to and use of the Service is also subject to Our Privacy Policy, which describes how We collect, use, and disclose personal information. Please read Our Privacy Policy carefully before using Our Service.
                        </Typography>

                        <Typography variant="h5" component="h2">Links to Other Websites</Typography>
                        <Typography variant="body1">
                            Our Service may contain links to third-party websites or services that are not owned or controlled by the Company.
                        </Typography>
                        <Typography variant="body1">
                            The Company has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services.
                        </Typography>

                        <Typography variant="h5" component="h2">Termination</Typography>
                        <Typography variant="body1">
                            We may terminate or suspend Your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.
                        </Typography>

                        <Typography variant="h5" component="h2">Limitation of Liability</Typography>
                        <Typography variant="body1">
                            Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of these Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service or 100 USD if You haven't purchased anything through the Service.
                        </Typography>

                        <Typography variant="h5" component="h2">"AS IS" and "AS AVAILABLE" Disclaimer</Typography>
                        <Typography variant="body1">
                            The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind.
                        </Typography>

                        <Typography variant="h5" component="h2">Governing Law</Typography>
                        <Typography variant="body1">
                            The laws of the Country, excluding its conflicts of law rules, shall govern these Terms and Your use of the Service.
                        </Typography>

                        <Typography variant="h5" component="h2">Disputes Resolution</Typography>
                        <Typography variant="body1">
                            If You have any concern or dispute about the Service, You agree to first try to resolve the dispute informally by contacting the Company.
                        </Typography>

                        <Typography variant="h5" component="h2">Changes to These Terms and Conditions</Typography>
                        <Typography variant="body1">
                            We reserve the right, at Our sole discretion, to modify or replace these Terms at any time.
                        </Typography>

                        <Typography variant="h5" component="h2">Contact Us</Typography>
                        <Typography variant="body1">
                            If you have any questions about these Terms and Conditions, You can contact us:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li">By email: contact@suthraone.com</Box>
                            <Box component="li">By visiting this page on our website: <Link href="https://suthraone.com/" target="_blank" rel="noopener">https://suthraone.com/</Link></Box>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default TermsConditionsPage;
